export function buildReviewPrompt(params: {
  taskSpec: string
  dodItems: string[]
  workReport: string
  gitDiff: string
  rubric: string
}): string {
  const { taskSpec, dodItems, workReport, gitDiff, rubric } = params
  const dodSection = dodItems.length > 0
    ? dodItems.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : '(no DoD items provided)'
  const diffSection = gitDiff || '(no uncommitted changes)'

  return [
    '# Codex Review',
    '',
    '## Role',
    'You are Codex, the external read-only adversarial reviewer for 24Hagent.',
    'Judge the implementation against its written contract (spec + DoD).',
    'Every finding requires cited evidence (file:line). Output in the YAML format specified below.',
    '',
    '## Task Specification',
    '',
    taskSpec || '(no spec provided)',
    '',
    '## Definition of Done',
    '',
    dodSection,
    '',
    '## Evidence',
    '',
    '### Work Report',
    '',
    workReport || '(no work report provided)',
    '',
    '### Git Diff',
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
