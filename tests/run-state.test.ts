import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseRunStateJson } from '../src/core/schemas/run-state.js'

const f = (name: string) =>
  readFileSync(resolve(import.meta.dirname!, 'fixtures', name), 'utf-8')

describe('parseRunStateJson', () => {
  it('parses factory INIT state', () => {
    const s = parseRunStateJson(f('run-state-init.json'))
    expect(s.phase).toBe('INIT')
    expect(s.active_task_id).toBeNull()
    expect(s.fix_history).toEqual([])
  })

  it('parses B0_COMPLETE state with fix_history', () => {
    const s = parseRunStateJson(f('run-state-b0.json'))
    expect(s.phase).toBe('B0_COMPLETE')
    expect(s.last_verdict).toBe('PASS')
    expect(s.fix_history).toHaveLength(3)
    expect(s.fix_history[0].verdict).toBe('NEED_FIX')
  })

  it('accepts old format missing fix_history', () => {
    const s = parseRunStateJson(f('run-state-no-fix-history.json'))
    expect(s.phase).toBe('ASK_CODEX_REVIEW')
    expect(s.fix_history).toEqual([])
    expect(s.retry_count).toBe(0)
  })

  it('rejects retry_count > 3', () => {
    expect(() => parseRunStateJson(f('run-state-bad-retry.json'))).toThrow()
  })

  it('parses fix_history with blocking_issue_ids', () => {
    const s = parseRunStateJson(f('run-state-b0.json'))
    expect(s.fix_history[0].blocking_issue_ids).toEqual(['BI-001'])
  })

  it('accepts fix_history entry with only required fields', () => {
    const s = parseRunStateJson(f('run-state-minimal-fix.json'))
    expect(s.fix_history[0].attempt).toBe(1)
    expect(s.fix_history[0].verdict).toBeUndefined()
  })

  it('rejects broken JSON', () => {
    expect(() => parseRunStateJson(f('run-state-broken.json'))).toThrow()
  })
})
