import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseCurrentTaskMarkdown } from '../schemas/task-package.js'
import { getAegisRuntimePaths } from './paths.js'
import { parseAegisRunStateJson, stringifyAegisRunState, type AegisRunState } from './run-state.js'

export type SafetySeverity = 'INFO' | 'HARD_BLOCK'

export type SafetyFinding = {
  code: string
  severity: SafetySeverity
  source: string
  evidence: string
  recommendation: string
}

export type SafetyCheckResult = {
  verdict: 'PASS' | 'HARD_BLOCK'
  findings: SafetyFinding[]
  changedFiles: string[]
  outOfScopeFiles: string[]
  reportPath: string
}

const FORBIDDEN_PATTERNS: { code: string; pattern: RegExp; recommendation: string }[] = [
  { code: 'FORBIDDEN_GIT_COMMIT', pattern: /\bgit\s+commit\b/i, recommendation: 'Ask the human to commit after Aegis renders a commit suggestion.' },
  { code: 'FORBIDDEN_GIT_PUSH', pattern: /\bgit\s+push\b/i, recommendation: 'Do not push from Aegis. Ask the human to push explicitly.' },
  { code: 'FORBIDDEN_GIT_MERGE', pattern: /\bgit\s+merge\b/i, recommendation: 'Do not merge from Aegis. Stop for human direction.' },
  { code: 'FORBIDDEN_GIT_REBASE', pattern: /\bgit\s+rebase\b/i, recommendation: 'Do not rebase from Aegis. Stop for human direction.' },
  { code: 'FORBIDDEN_GIT_RESET_HARD', pattern: /\bgit\s+reset\s+--hard\b/i, recommendation: 'Never rewrite or discard worktree state from Aegis.' },
  { code: 'FORBIDDEN_BRANCH_DELETE', pattern: /\b(git\s+branch\s+-D|delete\s+branch)\b/i, recommendation: 'Do not delete branches from Aegis.' },
  { code: 'FORBIDDEN_NPM_PUBLISH', pattern: /\bnpm\s+publish\b/i, recommendation: 'Do not publish packages from Aegis.' },
  { code: 'FORBIDDEN_DOCKER_PUSH', pattern: /\bdocker\s+push\b/i, recommendation: 'Do not push images from Aegis.' },
  { code: 'FORBIDDEN_DEPLOY', pattern: /\b(deploy\s+(to|now|prod|production)|run\s+deploy)\b/i, recommendation: 'Do not deploy from Aegis.' },
  { code: 'FORBIDDEN_RELEASE', pattern: /\b(create\s+release|publish\s+release|run\s+release)\b/i, recommendation: 'Do not release from Aegis.' },
  { code: 'FORBIDDEN_HISTORY_REWRITE', pattern: /\b(rewrite\s+git\s+history|history\s+rewrite)\b/i, recommendation: 'Do not rewrite Git history from Aegis.' }
]

function isNegatedSafetyStatement(line: string): boolean {
  return /\b(do not|must not|never|cannot|should not|may not|without|forbidden|Aegis still does not|Aegis must not)\b/i.test(line)
}

export function detectForbiddenActions(markdown: string, source: string): SafetyFinding[] {
  return markdown.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || isNegatedSafetyStatement(trimmed)) return []
    return FORBIDDEN_PATTERNS
      .filter(item => item.pattern.test(trimmed))
      .map(item => ({
        code: item.code,
        severity: 'HARD_BLOCK' as const,
        source,
        evidence: `${index + 1}: ${trimmed}`,
        recommendation: item.recommendation
      }))
  })
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '')
}

function isInScope(file: string, scope: string[]): boolean {
  const normalizedFile = normalizePath(file)
  return scope.some(rawScope => {
    const normalizedScope = normalizePath(rawScope)
    return normalizedFile === normalizedScope || normalizedFile.startsWith(`${normalizedScope}/`)
  })
}

function runGit(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 })
}

function listChangedFiles(root: string): string[] {
  const tracked = runGit(root, ['diff', '--name-only', 'HEAD'])
  const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard'])
  return [...tracked.split(/\r?\n/), ...untracked.split(/\r?\n/)].map(normalizePath).filter(Boolean)
}

function renderHumanHandoff(findings: SafetyFinding[]): string {
  return [
    '# Human Handoff',
    '',
    '## Reason',
    '',
    'Aegis detected a hard safety boundary. It is stopping instead of letting Claude Code continue.',
    '',
    '## Findings',
    '',
    ...findings.map(finding => [
      `- ${finding.code}: ${finding.evidence}`,
      `  - Source: ${finding.source}`,
      `  - Required action: ${finding.recommendation}`
    ].join('\n')),
    '',
    '## Boundary',
    '',
    'Only the human may approve or perform forbidden Git, publish, release, deploy, or history-rewrite actions.',
    ''
  ].join('\n')
}

export function renderSafetyReport(result: SafetyCheckResult, timestamp: string): string {
  const findingRows = result.findings.length > 0
    ? result.findings.map(finding => [
      `- ${finding.severity}: ${finding.code}`,
      `  - Source: ${finding.source}`,
      `  - Evidence: ${finding.evidence}`,
      `  - Recommendation: ${finding.recommendation}`
    ].join('\n')).join('\n')
    : '- None.'

  return [
    '# Safety Report',
    '',
    `Generated: ${timestamp}`,
    '',
    `Verdict: ${result.verdict}`,
    '',
    '## Dirty Worktree',
    '',
    result.changedFiles.length > 0 ? result.changedFiles.map(file => `- ${file}`).join('\n') : '- None.',
    '',
    '## File Scope Violations',
    '',
    result.outOfScopeFiles.length > 0 ? result.outOfScopeFiles.map(file => `- ${file}`).join('\n') : '- None.',
    '',
    '## Findings',
    '',
    findingRows,
    '',
    '## Forbidden Action Boundary',
    '',
    'Aegis may render instructions and suggestions. It must not execute commit, push, merge, rebase, reset, release, deploy, publish, branch deletion, Docker push, or Git history rewrite actions.',
    ''
  ].join('\n')
}

export function runSafetyCheck(root: string, timestamp = new Date().toISOString()): SafetyCheckResult {
  const paths = getAegisRuntimePaths(root)
  mkdirSync(paths.currentDir, { recursive: true })
  const currentTaskMarkdown = readFileSync(paths.currentTask, 'utf-8')
  const task = parseCurrentTaskMarkdown(currentTaskMarkdown)
  const workInstructionMarkdown = existsSync(paths.workInstruction) ? readFileSync(paths.workInstruction, 'utf-8') : ''
  const changedFiles = listChangedFiles(root)
  const outOfScopeFiles = changedFiles.filter(file => !isInScope(file, task.file_scope))
  const findings = [
    ...detectForbiddenActions(currentTaskMarkdown, 'current-task.md'),
    ...detectForbiddenActions(workInstructionMarkdown, 'work-instruction.md'),
    ...outOfScopeFiles.map(file => ({
      code: 'FILE_SCOPE_VIOLATION',
      severity: 'HARD_BLOCK' as const,
      source: 'git diff',
      evidence: file,
      recommendation: 'Narrow the change or update current-task.md file scope with human confirmation.'
    }))
  ]
  const result: SafetyCheckResult = {
    verdict: findings.some(finding => finding.severity === 'HARD_BLOCK') ? 'HARD_BLOCK' : 'PASS',
    findings,
    changedFiles,
    outOfScopeFiles,
    reportPath: paths.safetyReport
  }
  writeFileSync(paths.safetyReport, renderSafetyReport(result, timestamp), 'utf-8')

  if (result.verdict === 'HARD_BLOCK') {
    const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
    const nextState: AegisRunState = {
      ...state,
      phase: 'hard-blocked',
      last_verdict: 'NEED_HUMAN',
      updated_at: timestamp
    }
    writeFileSync(paths.runState, stringifyAegisRunState(nextState), 'utf-8')
    writeFileSync(paths.humanHandoff, renderHumanHandoff(findings), 'utf-8')
  }

  return result
}

export function renderCommitSuggestion(state: AegisRunState, summaryMarkdown: string): string {
  if (state.phase !== 'passed' || state.last_verdict !== 'PASS') {
    throw new Error('commit suggestion is available only after Codex PASS')
  }
  const summaryLine = summaryMarkdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#') && !line.startsWith('##')) ?? 'Complete current Aegis task.'
  return [
    '# Commit Suggestion',
    '',
    'Aegis does not execute commits. The human may use this suggestion after reviewing the final diff.',
    '',
    '## Suggested Commit Message',
    '',
    `feat: ${summaryLine.replace(/\.$/, '')}`,
    '',
    '## Boundary',
    '',
    'Aegis must not run `git commit`, `git push`, or any other forbidden Git action.',
    ''
  ].join('\n')
}

export function writeCommitSuggestion(root: string): string {
  const paths = getAegisRuntimePaths(root)
  const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const summary = existsSync(paths.roundSummary) ? readFileSync(paths.roundSummary, 'utf-8') : ''
  const suggestion = renderCommitSuggestion(state, summary)
  writeFileSync(paths.commitSuggestion, suggestion, 'utf-8')
  return paths.commitSuggestion
}
