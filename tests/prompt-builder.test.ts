import { describe, it, expect } from 'vitest'
import { buildReviewPrompt } from '../src/core/review/prompt-builder.js'

const base = {
  taskSpec: 'Implement feature X',
  dodItems: ['X works', 'X is tested'],
  workReport: 'Done.',
  gitDiff: 'diff --git a/x.ts b/x.ts',
  rubric: 'Output in YAML: verdict, blocking_issues, ...'
}

describe('buildReviewPrompt', () => {
  it('generates prompt with all sections', () => {
    const p = buildReviewPrompt(base)
    expect(p).toContain('# Codex Review')
    expect(p).toContain('## Task Specification')
    expect(p).toContain('Implement feature X')
    expect(p).toContain('## Definition of Done')
    expect(p).toContain('1. X works')
    expect(p).toContain('2. X is tested')
    expect(p).toContain('## Evidence')
    expect(p).toContain('### Git Diff')
    expect(p).toContain('diff --git a/x.ts b/x.ts')
    expect(p).toContain('## Review Rubric')
    expect(p).toContain('Output in YAML')
  })

  it('handles empty inputs gracefully', () => {
    const p = buildReviewPrompt({ taskSpec: '', dodItems: [], workReport: '', gitDiff: '', rubric: '' })
    expect(p).toContain('(no spec provided)')
    expect(p).toContain('(no DoD items provided)')
    expect(p).toContain('(no uncommitted changes)')
    expect(p).toContain('(no rubric provided)')
  })

  it('falls back when diff is empty', () => {
    const p = buildReviewPrompt({ ...base, gitDiff: '' })
    expect(p).toContain('(no uncommitted changes)')
  })

  it('renders DoD list as numbered items', () => {
    const p = buildReviewPrompt({ ...base, dodItems: ['A', 'B', 'C'] })
    expect(p).toContain('1. A\n2. B\n3. C')
  })
})
