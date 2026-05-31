import { describe, it, expect } from 'vitest'
import { renderReviewMarkdown } from '../src/core/review/result-renderer.js'
import type { ReviewResult } from '../src/core/schemas/review-result.js'

const passResult: ReviewResult = {
  schemaVersion: '1.0',
  verdict: 'PASS', confidence: 'high',
  blocking_issues: [], required_fixes: [],
  non_blocking_suggestions: [], human_questions: [],
  next_action: 'continue_next_task'
}

const needFixResult: ReviewResult = {
  schemaVersion: '1.0',
  verdict: 'NEED_FIX', confidence: 'high',
  blocking_issues: [{ id: 'BI-001', severity: 'BLOCKING', issue: 'Missing test',
    evidence: 'src/foo.ts:42', required_fix: 'Add test for empty input' }],
  required_fixes: ['Add test for empty input'],
  non_blocking_suggestions: [],
  human_questions: [],
  next_action: 'fix_current_task'
}

const needHumanResult: ReviewResult = {
  schemaVersion: '1.0',
  verdict: 'NEED_HUMAN', confidence: 'medium',
  blocking_issues: [], required_fixes: [],
  non_blocking_suggestions: [],
  human_questions: [{ question: 'Which approach?', options: ['A', 'B'] }],
  next_action: 'ask_human'
}

describe('renderReviewMarkdown', () => {
  it('renders PASS verdict', () => {
    const md = renderReviewMarkdown({ reviewResult: passResult, taskId: 'T-001', timestamp: 'ts' })
    expect(md).toContain('PASS')
    expect(md).toContain('T-001')
    expect(md).toContain('(none)')
    expect(md).not.toContain('## Non-Blocking Suggestions')
  })

  it('renders NEED_FIX with blocking issues and required fixes', () => {
    const md = renderReviewMarkdown({ reviewResult: needFixResult, taskId: 'T-002', timestamp: 'ts' })
    expect(md).toContain('NEED_FIX')
    expect(md).toContain('BI-001')
    expect(md).toContain('Add test for empty input')
    expect(md).toContain('fix_current_task')
  })

  it('renders NEED_HUMAN with human questions', () => {
    const md = renderReviewMarkdown({ reviewResult: needHumanResult, taskId: 'T-003', timestamp: 'ts' })
    expect(md).toContain('NEED_HUMAN')
    expect(md).toContain('## Human Questions')
    expect(md).toContain('Which approach?')
    expect(md).toContain('    - A')
  })

  it('shows non-blocking suggestions section when present', () => {
    const r: ReviewResult = { ...passResult, non_blocking_suggestions: [{ issue: 'nit', rationale: 'minor' }] }
    const md = renderReviewMarkdown({ reviewResult: r, taskId: 'x', timestamp: 'ts' })
    expect(md).toContain('## Non-Blocking Suggestions')
    expect(md).toContain('nit')
  })

  it('shows "not provided" when rawOutputPath missing', () => {
    const md = renderReviewMarkdown({ reviewResult: passResult, taskId: 'x', timestamp: 'ts' })
    expect(md).toContain('not provided')
  })
})
