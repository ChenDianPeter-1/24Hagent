import { describe, expect, it } from 'vitest'
import { renderTaskQualityReview, reviewCurrentTaskMarkdown, reviewTaskPackageQuality } from '../src/core/quality/task-quality-gate.js'
import type { TaskPackage } from '../src/core/schemas/task-package.js'

const task = (overrides: Partial<TaskPackage> = {}): TaskPackage => ({
  task_id: 'T-001',
  title: 'Implement focused review behavior',
  specification: 'Add one focused behavior and keep the change bounded.',
  file_scope: ['src/core/review'],
  definition_of_done: [
    { content: 'Review behavior is implemented in the scoped module', checked: false },
    { content: 'Focused tests cover pass and failure paths', checked: false }
  ],
  acceptance_checks: 'npm run test && npm run typecheck',
  stop_rule: 'Stop and ask for human confirmation if the change requires files outside File Scope.',
  ...overrides
})

describe('Task Quality Gate', () => {
  it('passes a focused executable task package', () => {
    const review = reviewTaskPackageQuality(task())

    expect(review.verdict).toBe('PASS')
    expect(review.findings).toEqual([])
  })

  it('requires fix when the task is too large', () => {
    const review = reviewTaskPackageQuality(task({
      specification: Array.from({ length: 45 }, (_, i) => `Step ${i}`).join('\n')
    }))

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings.map(f => f.code)).toContain('TASK_TOO_LARGE')
  })

  it('requires fix when file scope is too wide or broad', () => {
    const review = reviewTaskPackageQuality(task({
      file_scope: ['.', 'src/a', 'src/b', 'src/c', 'src/d', 'src/e', 'src/f', 'src/g', 'src/h']
    }))

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings.map(f => f.code)).toContain('FILE_SCOPE_TOO_WIDE')
    expect(review.findings.map(f => f.code)).toContain('FILE_SCOPE_BROAD_PATTERN')
  })

  it('requires fix when DoD is too sparse or vague', () => {
    const review = reviewTaskPackageQuality(task({
      definition_of_done: [{ content: 'done', checked: false }]
    }))

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings.map(f => f.code)).toContain('DOD_TOO_FEW')
    expect(review.findings.map(f => f.code)).toContain('DOD_TOO_VAGUE')
  })

  it('requires fix when acceptance checks are not executable', () => {
    const review = reviewTaskPackageQuality(task({
      acceptance_checks: 'Manually inspect the result.'
    }))

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings.map(f => f.code)).toContain('ACCEPTANCE_CHECKS_NOT_EXECUTABLE')
  })

  it('requires fix when stop rule is weak', () => {
    const review = reviewTaskPackageQuality(task({
      stop_rule: 'be careful'
    }))

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings.map(f => f.code)).toContain('STOP_RULE_TOO_WEAK')
  })

  it('requires human review for high-risk dependency or config scope', () => {
    const review = reviewTaskPackageQuality(task({
      file_scope: ['package.json', 'eslint.config.mjs']
    }))

    expect(review.verdict).toBe('NEED_HUMAN')
    expect(review.findings.map(f => f.code)).toContain('HIGH_RISK_SCOPE_NEEDS_HUMAN')
  })

  it('allows high-risk scope only when explicit human permission is recorded', () => {
    const review = reviewTaskPackageQuality(task({
      file_scope: ['package.json'],
      stop_rule: 'Explicit human permission was recorded for this high-risk scope. Stop and ask again before any extra files.'
    }))

    expect(review.verdict).toBe('PASS')
    expect(review.findings.map(f => f.code)).not.toContain('HIGH_RISK_SCOPE_NEEDS_HUMAN')
  })

  it('turns invalid markdown into a clear NEED_FIX result', () => {
    const review = reviewCurrentTaskMarkdown('# Current Task\n\n## Task ID\n')

    expect(review.verdict).toBe('NEED_FIX')
    expect(review.findings[0].code).toBe('TASK_SCHEMA_INVALID')
  })

  it('renders a readable report', () => {
    const report = renderTaskQualityReview(reviewTaskPackageQuality(task()))

    expect(report).toContain('# Task Quality Gate')
    expect(report).toContain('Verdict: PASS')
  })
})
