import { ZodError } from 'zod'
import { parseCurrentTaskMarkdown, type TaskPackage } from '../schemas/task-package.js'

export type TaskQualityVerdict = 'PASS' | 'NEED_FIX' | 'NEED_HUMAN'

export interface TaskQualityFinding {
  code: string
  severity: TaskQualityVerdict
  reason: string
  suggestion: string
}

export interface TaskQualityReview {
  verdict: TaskQualityVerdict
  findings: TaskQualityFinding[]
}

export interface TaskQualityOptions {
  maxFileScopeItems?: number
  minDodItems?: number
  maxSpecificationLines?: number
}

const COMMAND_PATTERNS = [
  /\bnpm\s+run\b/,
  /\bnpm\s+test\b/,
  /\bpnpm\s+/,
  /\byarn\s+/,
  /\bnode\s+/,
  /\bnpx\s+/,
  /\bpython\s+/,
  /\bpytest\b/,
  /\bpowershell\b/i,
  /\bscripts[\\/][^\s]+/
]

const HIGH_RISK_PATHS = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'eslint.config',
  'tsconfig',
  '.github',
  '.gitignore'
]

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '').trim()
}

function addFinding(findings: TaskQualityFinding[], finding: TaskQualityFinding): void {
  findings.push(finding)
}

function hasExecutableCheck(text: string): boolean {
  return COMMAND_PATTERNS.some(pattern => pattern.test(text))
}

function isBroadScope(path: string): boolean {
  const normalized = normalizePath(path)
  return normalized === '.' || normalized === '*' || normalized === '/' || normalized.endsWith('/**')
}

function hasHighRiskScope(path: string): boolean {
  const normalized = normalizePath(path)
  return HIGH_RISK_PATHS.some(risk => normalized === risk || normalized.startsWith(`${risk}/`) || normalized.includes(risk))
}

function isWeakStopRule(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (normalized.length < 20) return true
  return !/(stop|halt|pause|blocked|human|handoff|ask|confirm|停止|人工|阻断|确认)/i.test(normalized)
}

function isVagueDod(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return normalized.length < 12 || /^(done|ok|works|fixed|完成|搞定|通过)$/.test(normalized)
}

function computeVerdict(findings: TaskQualityFinding[]): TaskQualityVerdict {
  if (findings.some(finding => finding.severity === 'NEED_HUMAN')) return 'NEED_HUMAN'
  if (findings.some(finding => finding.severity === 'NEED_FIX')) return 'NEED_FIX'
  return 'PASS'
}

export function reviewTaskPackageQuality(task: TaskPackage, options: TaskQualityOptions = {}): TaskQualityReview {
  const maxFileScopeItems = options.maxFileScopeItems ?? 8
  const minDodItems = options.minDodItems ?? 2
  const maxSpecificationLines = options.maxSpecificationLines ?? 40
  const findings: TaskQualityFinding[] = []
  const specLines = task.specification.split(/\r?\n/).filter(Boolean).length

  if (specLines > maxSpecificationLines) {
    addFinding(findings, {
      code: 'TASK_TOO_LARGE',
      severity: 'NEED_FIX',
      reason: `Specification has ${specLines} non-empty lines, which suggests multiple tasks are bundled together.`,
      suggestion: 'Split the task into a smaller CURRENT_TASK.md with one objective and one acceptance path.'
    })
  }

  if (task.file_scope.length > maxFileScopeItems) {
    addFinding(findings, {
      code: 'FILE_SCOPE_TOO_WIDE',
      severity: 'NEED_FIX',
      reason: `File Scope lists ${task.file_scope.length} entries; limit is ${maxFileScopeItems}.`,
      suggestion: 'Narrow File Scope to the exact files or smallest directories the Worker may edit.'
    })
  }

  const broadScopes = task.file_scope.filter(isBroadScope)
  if (broadScopes.length > 0) {
    addFinding(findings, {
      code: 'FILE_SCOPE_BROAD_PATTERN',
      severity: 'NEED_FIX',
      reason: `File Scope contains broad entries: ${broadScopes.join(', ')}.`,
      suggestion: 'Replace broad scope entries with concrete files or narrowly bounded directories.'
    })
  }

  if (task.definition_of_done.length < minDodItems) {
    addFinding(findings, {
      code: 'DOD_TOO_FEW',
      severity: 'NEED_FIX',
      reason: `Definition of DoD has ${task.definition_of_done.length} item(s); minimum is ${minDodItems}.`,
      suggestion: 'Add concrete, independently verifiable DoD items.'
    })
  }

  const vagueDodItems = task.definition_of_done.filter(item => isVagueDod(item.content))
  if (vagueDodItems.length > 0) {
    addFinding(findings, {
      code: 'DOD_TOO_VAGUE',
      severity: 'NEED_FIX',
      reason: `DoD contains vague item(s): ${vagueDodItems.map(item => item.content).join('; ')}.`,
      suggestion: 'Rewrite DoD items so each can be checked from code, tests, generated reports, or CLI output.'
    })
  }

  if (!hasExecutableCheck(task.acceptance_checks)) {
    addFinding(findings, {
      code: 'ACCEPTANCE_CHECKS_NOT_EXECUTABLE',
      severity: 'NEED_FIX',
      reason: 'Acceptance Checks do not appear to include an executable command.',
      suggestion: 'Add concrete commands such as npm run test, npm run typecheck, pytest, or scripts/validate_task.ps1.'
    })
  }

  if (isWeakStopRule(task.stop_rule)) {
    addFinding(findings, {
      code: 'STOP_RULE_TOO_WEAK',
      severity: 'NEED_FIX',
      reason: 'Stop Rule does not clearly say when to stop, ask, hand off, or block execution.',
      suggestion: 'State the exact condition that requires Worker to stop and ask the Orchestrator or human.'
    })
  }

  const highRiskScopes = task.file_scope.filter(hasHighRiskScope)
  if (highRiskScopes.length > 0) {
    addFinding(findings, {
      code: 'HIGH_RISK_SCOPE_NEEDS_HUMAN',
      severity: 'NEED_HUMAN',
      reason: `Task touches high-risk configuration/dependency scope: ${highRiskScopes.join(', ')}.`,
      suggestion: 'Get explicit human confirmation before Worker changes dependency, config, gitignore, or CI boundary files.'
    })
  }

  return { verdict: computeVerdict(findings), findings }
}

export function reviewCurrentTaskMarkdown(rawMarkdown: string, options?: TaskQualityOptions): TaskQualityReview {
  try {
    return reviewTaskPackageQuality(parseCurrentTaskMarkdown(rawMarkdown), options)
  } catch (error) {
    const reason = error instanceof ZodError
      ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      : error instanceof Error ? error.message : String(error)
    return {
      verdict: 'NEED_FIX',
      findings: [{
        code: 'TASK_SCHEMA_INVALID',
        severity: 'NEED_FIX',
        reason,
        suggestion: 'Regenerate CURRENT_TASK.md with all required headings and non-empty fields.'
      }]
    }
  }
}

export function renderTaskQualityReview(review: TaskQualityReview): string {
  const findingLines = review.findings.length === 0
    ? ['No blocking task quality findings.']
    : review.findings.flatMap((finding, index) => [
      `${index + 1}. ${finding.code} (${finding.severity})`,
      `   Reason: ${finding.reason}`,
      `   Fix: ${finding.suggestion}`
    ])

  return [
    '# Task Quality Gate',
    '',
    `Verdict: ${review.verdict}`,
    '',
    '## Findings',
    '',
    ...findingLines,
    ''
  ].join('\n')
}
