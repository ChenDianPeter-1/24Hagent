import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { ReviewResult } from '../schemas/review-result.js'
import { getAegisRuntimePaths } from './paths.js'
import { parseAegisRunStateJson, stringifyAegisRunState, type AegisRunState } from './run-state.js'

export type CodexReviewRoute = {
  state: AegisRunState
  writtenFiles: string[]
}

function bulletList(items: string[]): string {
  return items.length > 0 ? items.map(item => `- ${item}`).join('\n') : '- None.'
}

function blockingIssues(result: ReviewResult): string {
  return result.blocking_issues.length > 0
    ? result.blocking_issues.map(issue => [
      `- ${issue.id}: ${issue.issue}`,
      `  Evidence: ${issue.evidence}`,
      `  Required fix: ${issue.required_fix}`
    ].join('\n')).join('\n')
    : '- None.'
}

function humanQuestions(result: ReviewResult): string {
  return result.human_questions.length > 0
    ? result.human_questions.map(question => [
      `- ${question.question}`,
      ...question.options.map(option => `  - ${option}`)
    ].join('\n')).join('\n')
    : '- None provided by Codex.'
}

function renderNeedFixInstruction(result: ReviewResult): string {
  const fixes = result.required_fixes.length > 0
    ? result.required_fixes
    : result.blocking_issues.map(issue => issue.required_fix)

  return [
    '# Work Instruction',
    '',
    '## Task',
    '',
    'Repair the current task based on Codex review.',
    '',
    '## Instruction',
    '',
    'Claude Code must repair only the bounded fixes below, stay inside `current-task.md` file scope, leave updated discipline evidence, then rerun Aegis gates.',
    '',
    '## Required Fixes',
    '',
    bulletList(fixes),
    '',
    '## Blocking Issues',
    '',
    blockingIssues(result),
    '',
    '## Boundaries',
    '',
    '- Do not expand scope without human confirmation.',
    '- Do not commit, push, merge, release, deploy, publish, or rewrite Git history.',
    '- Run validation and request Codex review again after the repair.',
    ''
  ].join('\n')
}

function renderHumanHandoff(result: ReviewResult): string {
  return [
    '# Human Handoff',
    '',
    '## Reason',
    '',
    'Codex returned `NEED_HUMAN`; Aegis is stopping instead of asking Claude Code to guess.',
    '',
    '## Human Questions',
    '',
    humanQuestions(result),
    '',
    '## Blocking Issues',
    '',
    blockingIssues(result),
    '',
    '## Boundary',
    '',
    'Claude Code must wait for human direction before continuing this round.',
    ''
  ].join('\n')
}

function renderPassSummary(result: ReviewResult, taskId: string | null, timestamp: string): string {
  return [
    '# Round Summary',
    '',
    '## Summary',
    '',
    `Codex returned \`PASS\` for ${taskId ?? 'the current task'}. Aegis marked the round as passed and ready for archive or next-task selection.`,
    '',
    '## Timestamp',
    '',
    timestamp,
    '',
    '## Codex Confidence',
    '',
    result.confidence,
    '',
    '## Non-Blocking Suggestions',
    '',
    result.non_blocking_suggestions.length > 0
      ? result.non_blocking_suggestions.map(item => `- ${item.issue}: ${item.rationale}`).join('\n')
      : '- None.',
    ''
  ].join('\n')
}

export function routeCodexReviewResult(root: string, result: ReviewResult, timestamp: string): CodexReviewRoute {
  const paths = getAegisRuntimePaths(root)
  const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const writtenFiles: string[] = []

  const nextState: AegisRunState = {
    ...state,
    last_verdict: result.verdict,
    updated_at: timestamp
  }

  if (result.verdict === 'PASS') {
    nextState.phase = 'passed'
    nextState.retry_count = 0
    writeFileSync(paths.roundSummary, renderPassSummary(result, state.task_id, timestamp), 'utf-8')
    writtenFiles.push(paths.roundSummary)
  } else if (result.verdict === 'NEED_FIX') {
    nextState.phase = 'need-fix'
    nextState.retry_count = state.retry_count + 1
    writeFileSync(paths.workInstruction, renderNeedFixInstruction(result), 'utf-8')
    writtenFiles.push(paths.workInstruction)
  } else {
    nextState.phase = 'human-handoff'
    writeFileSync(paths.humanHandoff, renderHumanHandoff(result), 'utf-8')
    writtenFiles.push(paths.humanHandoff)
  }

  writeFileSync(paths.runState, stringifyAegisRunState(nextState), 'utf-8')
  writtenFiles.push(paths.runState)

  if (existsSync(paths.status)) {
    writtenFiles.push(paths.status)
  }

  return {
    state: nextState,
    writtenFiles
  }
}
