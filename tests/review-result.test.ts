import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseCodexJsonlToReviewResult } from '../src/core/schemas/review-result.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname!, 'fixtures', name), 'utf-8')

describe('parseCodexJsonlToReviewResult', () => {
  it('parses a PASS verdict', () => {
    const r = parseCodexJsonlToReviewResult(fixture('codex-review-pass.jsonl'))
    expect(r.verdict).toBe('PASS')
    expect(r.confidence).toBe('high')
    expect(r.blocking_issues).toHaveLength(0)
    expect(r.next_action).toBe('continue_next_task')
  })

  it('parses a NEED_FIX verdict with blocking issues', () => {
    const r = parseCodexJsonlToReviewResult(fixture('codex-review-need-fix.jsonl'))
    expect(r.verdict).toBe('NEED_FIX')
    expect(r.blocking_issues).toHaveLength(1)
    expect(r.blocking_issues[0].id).toBe('BI-001')
    expect(r.required_fixes).toContain('Add test for empty input')
    expect(r.next_action).toBe('fix_current_task')
  })

  it('parses a NEED_HUMAN verdict with human questions', () => {
    const r = parseCodexJsonlToReviewResult(fixture('codex-review-need-human.jsonl'))
    expect(r.verdict).toBe('NEED_HUMAN')
    expect(r.human_questions).toHaveLength(1)
    expect(r.human_questions[0].question).toBe('Which approach?')
    expect(r.next_action).toBe('ask_human')
  })

  it('defaults empty arrays for optional fields', () => {
    const r = parseCodexJsonlToReviewResult(fixture('codex-review-pass.jsonl'))
    expect(r.non_blocking_suggestions).toEqual([])
    expect(r.human_questions).toEqual([])
    expect(r.schemaVersion).toBe('1.0')
  })

  it('throws on JSONL with no agent_message', () => {
    expect(() =>
      parseCodexJsonlToReviewResult(fixture('codex-review-corrupt.jsonl'))
    ).toThrow('No agent_message')
  })

  it('throws when agent message has no verdict line', () => {
    expect(() =>
      parseCodexJsonlToReviewResult(fixture('codex-review-no-verdict.jsonl'))
    ).toThrow('No verdict line')
  })

  it('parses fenced YAML block', () => {
    const r = parseCodexJsonlToReviewResult(fixture('codex-review-fenced.jsonl'))
    expect(r.verdict).toBe('PASS')
    expect(r.next_action).toBe('continue_next_task')
  })

  it('throws on invalid JSONL', () => {
    expect(() => parseCodexJsonlToReviewResult('not json')).toThrow()
  })
})
