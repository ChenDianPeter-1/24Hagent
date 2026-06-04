import { describe, it, expect } from 'vitest'
import { buildReviewPrompt } from '../src/core/review/prompt-builder.js'
import type { ReviewEvidence } from '../src/core/review/evidence-builder.js'

const base: ReviewEvidence = {
  task: {
    task_id: 'T-001',
    title: 'Feature X',
    specification: 'Implement feature X',
    file_scope: ['src/x.ts'],
    definition_of_done: [
      { content: 'X works', checked: false },
      { content: 'X is tested', checked: false }
    ],
    acceptance_checks: 'npm test',
    stop_rule: 'Stop before deploy.'
  },
  workReport: 'Done.',
  superpowerSummary: 'Superpower sources recorded.',
  disciplineReport: 'Verdict: PASS',
  validationReport: 'Tests passed.',
  changedFiles: ['src/x.ts'],
  scopedDiff: 'diff --git a/x.ts b/x.ts',
  rubric: 'Output in YAML: verdict, blocking_issues, ...'
}

describe('buildReviewPrompt', () => {
  it('generates prompt with all sections', () => {
    const p = buildReviewPrompt(base)
    expect(p).toContain('# Codex Review')
    expect(p).toContain('## Task Identity')
    expect(p).toContain('Task ID: T-001')
    expect(p).toContain('## Task Specification')
    expect(p).toContain('Implement feature X')
    expect(p).toContain('## File Scope')
    expect(p).toContain('- src/x.ts')
    expect(p).toContain('## Definition of Done')
    expect(p).toContain('1. X works')
    expect(p).toContain('2. X is tested')
    expect(p).toContain('## Acceptance Checks')
    expect(p).toContain('npm test')
    expect(p).toContain('## Stop Rule')
    expect(p).toContain('Stop before deploy.')
    expect(p).toContain('## Evidence')
    expect(p).toContain('### Superpower Source Summary')
    expect(p).toContain('Superpower sources recorded.')
    expect(p).toContain('### Superpower Discipline Report')
    expect(p).toContain('Verdict: PASS')
    expect(p).toContain('### Validation Report')
    expect(p).toContain('Tests passed.')
    expect(p).toContain('### Changed Files Summary')
    expect(p).toContain('### Scoped Git Diff')
    expect(p).toContain('diff --git a/x.ts b/x.ts')
    expect(p).toContain('## Review Rubric')
    expect(p).toContain('Output in YAML')
  })

  it('handles empty inputs gracefully', () => {
    const p = buildReviewPrompt({
      ...base,
      task: {
        ...base.task,
        specification: '',
        file_scope: [],
        definition_of_done: [],
        acceptance_checks: '',
        stop_rule: ''
      },
      workReport: '',
      superpowerSummary: '',
      disciplineReport: '',
      validationReport: '',
      changedFiles: [],
      scopedDiff: '',
      rubric: ''
    })
    expect(p).toContain('(no spec provided)')
    expect(p).toContain('(no file scope provided)')
    expect(p).toContain('(no DoD items provided)')
    expect(p).toContain('(no acceptance checks provided)')
    expect(p).toContain('(no stop rule provided)')
    expect(p).toContain('(no validation report provided)')
    expect(p).toContain('(no Superpower source summary provided)')
    expect(p).toContain('(no Superpower discipline report provided)')
    expect(p).toContain('(no changed files)')
    expect(p).toContain('(no uncommitted changes)')
    expect(p).toContain('(no rubric provided)')
  })

  it('falls back when diff is empty', () => {
    const p = buildReviewPrompt({ ...base, scopedDiff: '' })
    expect(p).toContain('(no uncommitted changes)')
  })

  it('renders DoD list as numbered items', () => {
    const p = buildReviewPrompt({
      ...base,
      task: {
        ...base.task,
        definition_of_done: [
          { content: 'A', checked: false },
          { content: 'B', checked: false },
          { content: 'C', checked: false }
        ]
      }
    })
    expect(p).toContain('1. A\n2. B\n3. C')
  })
})
