import { z } from 'zod'
import type { GateConfig, GatePlan, GateResult, CoverageData, ThresholdResult, ValidationVerdict } from './validation-types.js'
import type { CommandRunner } from '../../adapters/shell/command-runner.js'

/** Parse vitest --reporter=json-summary stdout into CoverageData. */
export function parseCoverageFromRawOutput(rawOutput: string): CoverageData {
  if (!rawOutput.trim()) throw new Error('Coverage output is empty')

  // vitest stdout may contain ANSI codes and a text table before the JSON
  const jsonStart = rawOutput.indexOf('{"total":')
  const jsonStr = jsonStart >= 0 ? rawOutput.slice(jsonStart) : rawOutput

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

  return { lines: pct('lines'), branches: pct('branches'), functions: pct('functions'), statements: pct('statements') }
}

/** Compare coverage against thresholds. No rounding — actual must be >= required. */
export function evaluateThresholds(
  coverage: CoverageData,
  thresholds: { lines: number; branches: number; functions: number; statements: number }
): ThresholdResult {
  const metrics = [
    { name: 'lines',      actual: coverage.lines,      required: thresholds.lines },
    { name: 'branches',   actual: coverage.branches,   required: thresholds.branches },
    { name: 'functions',  actual: coverage.functions,  required: thresholds.functions },
    { name: 'statements', actual: coverage.statements, required: thresholds.statements }
  ].map(m => ({ ...m, pass: m.actual >= m.required }))

  return { metrics, overall: metrics.every(m => m.pass) }
}

// -- gate config loading (Zod) -----------------------------------------------

const CoverageThresholdSchema = z.object({
  lines: z.number(), branches: z.number(), functions: z.number(), statements: z.number()
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
