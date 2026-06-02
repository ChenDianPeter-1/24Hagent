import type { ReviewEvidence } from './evidence-builder.js'

function renderList(items: string[], emptyText: string): string {
  return items.length > 0 ? items.map((d, i) => `${i + 1}. ${d}`).join('\n') : emptyText
}

function renderBullets(items: string[], emptyText: string): string {
  return items.length > 0 ? items.map(item => `- ${item}`).join('\n') : emptyText
}

export function buildReviewPrompt(evidence: ReviewEvidence): string {
  const { task, workReport, validationReport, scopedDiff, rubric, changedFiles } = evidence
  const diffSection = scopedDiff || '(no uncommitted changes)'

  return [
    '# Codex Review',
    '',
    '## Role',
    'You are Codex, the external read-only adversarial reviewer for Aegis.',
    'Judge the implementation against its written contract (spec + DoD).',
    'Every finding requires cited evidence (file:line). Output in the YAML format specified below.',
    '',
    '## Task Identity',
    '',
    `Task ID: ${task.task_id || '(no task id provided)'}`,
    `Title: ${task.title || '(no title provided)'}`,
    '',
    '## Task Specification',
    '',
    task.specification || '(no spec provided)',
    '',
    '## File Scope',
    '',
    renderBullets(task.file_scope, '(no file scope provided)'),
    '',
    '## Definition of Done',
    '',
    renderList(task.definition_of_done.map(d => d.content), '(no DoD items provided)'),
    '',
    '## Acceptance Checks',
    '',
    task.acceptance_checks || '(no acceptance checks provided)',
    '',
    '## Stop Rule',
    '',
    task.stop_rule || '(no stop rule provided)',
    '',
    '## Evidence',
    '',
    '### Work Report',
    '',
    workReport || '(no work report provided)',
    '',
    '### Validation Report',
    '',
    validationReport || '(no validation report provided)',
    '',
    '### Changed Files Summary',
    '',
    renderBullets(changedFiles, '(no changed files)'),
    '',
    '### Scoped Git Diff',
    '',
    '```diff',
    diffSection,
    '```',
    '',
    '## Review Rubric',
    '',
    rubric || '(no rubric provided)',
    ''
  ].join('\n')
}
