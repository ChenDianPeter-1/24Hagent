import { z } from 'zod'
import type { GateConfig, GatePlan, GateResult, CoverageData, ThresholdResult, ValidationVerdict } from './validation-types.js'
import type { CommandRunner } from '../../adapters/shell/command-runner.js'

/** Parse vitest --reporter=json-summary OR coverage.py JSON stdout into CoverageData. */
export function parseCoverageFromRawOutput(rawOutput: string): CoverageData {
  if (!rawOutput.trim()) throw new Error('Coverage output is empty')

  // Detect format: vitest uses {"total":...}, coverage.py uses {"totals":...}
  const isCoveragePy = rawOutput.includes('"totals"') && rawOutput.includes('"percent_covered"')

  if (isCoveragePy) return parseCoveragePyJson(rawOutput)
  return parseVitestJson(rawOutput)
}

function parseVitestJson(raw: string): CoverageData {
  const jsonStart = raw.indexOf('{"total":')
  const jsonStr = jsonStart >= 0 ? extractJsonObject(raw, jsonStart) : raw

  let parsed: unknown
  try { parsed = JSON.parse(jsonStr) } catch {
    throw new Error('Failed to parse coverage JSON from output')
  }

  const total = (parsed as Record<string, unknown>)?.total as Record<string, unknown> | undefined
  if (!total) throw new Error('Coverage JSON missing "total" field')

  const pct = (key: string): number => {
    const v = (total[key] as Record<string, unknown>)?.pct
    if (typeof v !== 'number') throw new Error(`Coverage missing total.${key}.pct`)
    return v
  }

  return { lines: pct('lines'), branches: pct('branches'), functions: pct('functions'), statements: pct('statements'), profile: 'vitest' }
}

function extractJsonObject(raw: string, start: number): string {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < raw.length; index++) {
    const char = raw[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) return raw.slice(start, index + 1)
    }
  }

  return raw.slice(start)
}

function parseCoveragePyJson(raw: string): CoverageData {
  const jsonStart = raw.indexOf('{"meta":') >= 0 ? raw.indexOf('{"meta":')
    : raw.indexOf('{"files":') >= 0 ? raw.indexOf('{"files":')
    : raw.indexOf('{"totals":')
  const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart) : raw

  let parsed: unknown
  try { parsed = JSON.parse(jsonStr) } catch {
    throw new Error('Failed to parse coverage.py JSON from output')
  }

  const totals = (parsed as Record<string, unknown>)?.totals as Record<string, unknown> | undefined
  if (!totals) throw new Error('Coverage JSON missing "totals" field')

  const numStmts = typeof totals.num_statements === 'number' ? totals.num_statements : 0
  const coveredLines = typeof totals.covered_lines === 'number' ? totals.covered_lines : 0
  const lines = numStmts > 0 ? (coveredLines / numStmts) * 100 : 0

  // branches: only available with --branch flag
  let branches: number | null = null
  if (typeof totals.num_branches === 'number' && totals.num_branches > 0) {
    branches = ((totals.covered_branches as number) ?? 0) / (totals.num_branches as number) * 100
  }

  return { lines, branches, functions: null, statements: lines, profile: 'coverage_py' }
}

/** Compare coverage against thresholds. null metrics are skipped (tool doesn't support them). */
export function evaluateThresholds(
  coverage: CoverageData,
  thresholds: { lines: number; branches: number | null; functions: number | null; statements: number }
): ThresholdResult {
  const metrics: { name: string; actual: number | null; required: number | null; pass: boolean }[] = [
    { name: 'lines',      actual: coverage.lines,      required: thresholds.lines,      pass: false },
    { name: 'branches',   actual: coverage.branches,   required: thresholds.branches,   pass: false },
    { name: 'functions',  actual: coverage.functions,  required: thresholds.functions,  pass: false },
    { name: 'statements', actual: coverage.statements, required: thresholds.statements, pass: false }
  ]
  for (const m of metrics) {
    if (m.required === null) { m.pass = true; continue } // 配置跳过该指标
    if (m.actual === null) { m.pass = false; continue }  // 工具不支持但配置要求 → FAIL
    m.pass = m.actual >= m.required
  }
  return { metrics, overall: metrics.every(m => m.pass) }
}

// -- gate config loading (Zod) -----------------------------------------------

const CoverageThresholdSchema = z.object({
  lines: z.number(),
  branches: z.number().nullable(),
  functions: z.number().nullable(),
  statements: z.number()
})

const GateConfigSchema = z.object({
  enabled: z.boolean(),
  command: z.string(),
  blocking: z.boolean(),
  description: z.string(),
  threshold: CoverageThresholdSchema.optional()
})

const QualityGatesSchema = z.object({
  gates: z.object({ test: GateConfigSchema, lint: GateConfigSchema, typecheck: GateConfigSchema, coverage: GateConfigSchema })
})

const GATE_ORDER = ['test', 'lint', 'typecheck', 'coverage'] as const

export function loadGateConfig(raw: unknown): GateConfig[] {
  const validated = QualityGatesSchema.parse(raw)
  return GATE_ORDER.map(name => validated.gates[name])
}

// -- gate planning -----------------------------------------------------------

export function planGateExecutions(configs: GateConfig[]): GatePlan[] {
  return configs.map((c, i) => ({
    name: GATE_ORDER[i] ?? `gate_${i}`,
    command: c.command,
    blocking: c.blocking,
    disabled: !c.enabled
  }))
}

// -- gate execution ----------------------------------------------------------

export async function runConfiguredGates(
  plans: GatePlan[],
  runner: CommandRunner
): Promise<GateResult[]> {
  const results: GateResult[] = []
  for (const plan of plans) {
    if (plan.disabled) {
      results.push({ name: plan.name, command: plan.command, exitCode: null,
        stdout: '', stderr: '', status: 'SKIPPED', rawOutput: '' })
      continue
    }
    try {
      const r = await runner.run(plan.command)
      results.push({ name: plan.name, command: plan.command,
        exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr,
        status: r.exitCode === 0 ? 'PASS' : 'FAIL',
        rawOutput: (r.stdout + '\n' + r.stderr).trim() })
    } catch (e) {
      results.push({ name: plan.name, command: plan.command,
        exitCode: null, stdout: '', stderr: '',
        status: 'UNAVAILABLE',
        rawOutput: e instanceof Error ? e.message : String(e) })
    }
  }
  return results
}

// -- result evaluation -------------------------------------------------------

export function evaluateGateResults(
  results: GateResult[],
  configs: GateConfig[]
): ValidationVerdict {
  const blockingFailures: string[] = []
  let coverageData: CoverageData | null = null
  let thresholdResult: ThresholdResult | null = null

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const c = configs[i]

    if (r.status === 'FAIL' && c.blocking) {
      blockingFailures.push(`${r.name} (exit code ${r.exitCode})`)
    }
    if (r.status === 'UNAVAILABLE' && c.blocking) {
      blockingFailures.push(`${r.name} (UNAVAILABLE: command could not run)`)
    }
  }

  // coverage special handling
  const covIdx = results.findIndex(r => r.name === 'coverage')
  if (covIdx >= 0) {
    const covCfg = configs[covIdx]
    const covRes = results[covIdx]

    if (covCfg.enabled && covCfg.blocking && covRes.status !== 'SKIPPED') {
      if (!covCfg.threshold) {
        blockingFailures.push('coverage (CONFIG_ERROR: blocking coverage gate missing threshold)')
      } else {
        try {
          coverageData = parseCoverageFromRawOutput(covRes.rawOutput)
          thresholdResult = evaluateThresholds(coverageData, covCfg.threshold)
          if (!thresholdResult.overall) {
            const failed = thresholdResult.metrics.filter(m => !m.pass).map(m => m.name)
            blockingFailures.push(`coverage (threshold not met: ${failed.join(', ')})`)
          }
        } catch (e) {
          blockingFailures.push(`coverage (PARSE_FAILED: ${e instanceof Error ? e.message : String(e)})`)
        }
      }
    }
  }

  return {
    overall: blockingFailures.length === 0 ? 'PASS' : 'FAIL',
    blockingFailures,
    gateResults: results,
    coverage: coverageData,
    threshold: thresholdResult
  }
}

// -- report rendering --------------------------------------------------------

export function renderValidationReport(params: {
  verdict: ValidationVerdict
  taskId: string
  timestamp: string
  readinessVerdict: string
  fileScopeCheck?: { files: string[]; inScope: boolean; violations: string[] }
}): string {
  const { verdict, taskId, timestamp, readinessVerdict, fileScopeCheck } = params
  const readinessNote = readinessVerdict === 'BLOCKED'
    ? 'BLOCKED - quality gates cannot execute until tooling is configured.'
    : 'Project tooling is configured.'

  const gateRows = verdict.gateResults.map(r => {
    const exit = r.exitCode !== null ? String(r.exitCode) : 'N/A'
    const detail = r.status === 'PASS' ? 'Exit code 0'
      : r.status === 'SKIPPED' ? 'Gate disabled in config'
      : r.rawOutput.length > 500 ? r.rawOutput.slice(0, 500) + '...(truncated)'
      : r.rawOutput
    return `| ${r.name} | \`${r.command}\` | ${exit} | ${r.status} | ${detail} |`
  })

  let coverageSection = ''
  if (verdict.coverage && verdict.threshold) {
    const rows = verdict.threshold.metrics.map(m => {
      const actual = m.actual !== null ? `${m.actual}%` : 'N/A'
      const required = m.required !== null ? `${m.required}%` : 'N/A'
      return `| ${m.name.charAt(0).toUpperCase() + m.name.slice(1)} | ${actual} | ${required} | ${m.pass ? 'PASS' : 'FAIL'} |`
    })
    coverageSection = `\n## Coverage Detail\n\n| Metric | Actual | Required | Status |\n|--------|--------|----------|--------|\n${rows.join('\n')}\n`
  }

  const scopeFiles = fileScopeCheck?.files.length
    ? fileScopeCheck.files.map(f => `- ${f}`).join('\n')
    : '- (no changes detected)'
  const scopeAll = fileScopeCheck ? fileScopeCheck.inScope ? 'YES' : 'NO' : 'NOT_EVALUATED'
  const scopeStatus = fileScopeCheck ? fileScopeCheck.inScope ? 'PASS' : 'FAIL' : 'NOT_RUN'
  const scopeViolations = fileScopeCheck?.violations.length
    ? fileScopeCheck.violations.map(v => `- ${v}`).join('\n')
    : '- None.'

  const blockingSection = verdict.blockingFailures.length === 0
    ? 'None.'
    : verdict.blockingFailures.map(f => `- ${f}`).join('\n')

  const nextSteps = verdict.overall === 'PASS'
    ? '1. All quality gates passed. Ready for Codex review.\n2. Run: scripts/codex_review.ps1'
    : '1. Review blocking failures above.\n2. Fix issues and re-run validation.\n3. Run: scripts/validate_task.ps1'

  return [
    '# Validation Report',
    '',
    `<!-- Auto-generated by aegis validate at ${timestamp} -->`,
    '<!-- Aegis runs this independently. Never trust construction self-report. -->',
    '',
    '## Task ID',
    '',
    taskId,
    '',
    '## Timestamp',
    '',
    timestamp,
    '',
    '## Project Readiness',
    '',
    `Readiness verdict: ${readinessVerdict}. ${readinessNote}`,
    '',
    '## TDD Enforcement',
    '',
    'TDD Required: YES - TDD is required. Worker must write failing tests before implementation.',
    '',
    '## Gate Results',
    '',
    '| Gate | Command | Exit Code | Status | Detail |',
    '|------|---------|-----------|--------|--------|',
    ...gateRows,
    '',
    coverageSection,
    '## File Scope Check',
    '',
    `- Files changed: ${fileScopeCheck?.files.length ? '' : '(no changes detected)'}`,
    scopeFiles,
    `- All within scope: ${scopeAll}`,
    `- Scope check status: ${scopeStatus}`,
    `- Violations: ${scopeViolations}`,
    '',
    '## Overall Verdict',
    '',
    `**${verdict.overall}**`,
    '',
    '## Blocking Failures',
    '',
    blockingSection,
    '',
    '## Recommended Next Steps',
    '',
    nextSteps,
    '',
    '## Enforcement Notes',
    '',
    '- Source of truth: `QUALITY_GATES.json`',
    '- Any blocking gate failure = overall validation FAIL',
    '- Coverage below threshold = BLOCKING failure',
    '- Aegis must run gates independently (do not trust construction self-report)',
    ''
  ].join('\n')
}
