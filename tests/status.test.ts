import { describe, it, expect, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatStatus, runStatus } from '../src/cli/status.js'
import type { RunState } from '../src/core/schemas/run-state.js'
import type { TaskPackage } from '../src/core/schemas/task-package.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const rs = (overrides: Partial<RunState> = {}): RunState => ({
  active_task_id: null, phase: 'INIT', retry_count: 0, last_verdict: null,
  consecutive_failures: 0, fix_history: [], updated_at: null, ...overrides
})

const tp = (overrides: Partial<TaskPackage> = {}): TaskPackage => ({
  task_id: 'T-001', title: '测试任务', specification: 'spec',
  file_scope: ['a.ts'], definition_of_done: [{ content: 'd', checked: false }],
  acceptance_checks: 'npm test', stop_rule: 'stop', ...overrides
})

describe('formatStatus', () => {
  it('shows INIT state with null fields', () => {
    const out = formatStatus(rs(), tp())
    expect(out).toBe('当前阶段: INIT\n当前任务: T-001 - 测试任务\n上次审查: 无')
  })

  it('shows running state with verdict', () => {
    const out = formatStatus(
      rs({ phase: 'EXECUTE_TASK', active_task_id: 'B2-1', last_verdict: 'PASS' }),
      tp({ task_id: 'B2-1-status-cli', title: 'status命令' })
    )
    expect(out).toContain('当前阶段: EXECUTE_TASK')
    expect(out).toContain('当前任务: B2-1-status-cli - status命令')
    expect(out).toContain('上次审查: PASS')
  })

  it('shows B0_COMPLETE with full context', () => {
    const out = formatStatus(
      rs({ phase: 'B0_COMPLETE', active_task_id: 'B0-state-normalization',
        last_verdict: 'PASS', retry_count: 0 }),
      tp({ task_id: 'B0-state-normalization', title: '状态归一化' })
    )
    expect(out).toBe(
      '当前阶段: B0_COMPLETE\n当前任务: B0-state-normalization - 状态归一化\n上次审查: PASS'
    )
  })

  it('always produces exactly 3 lines', () => {
    const out = formatStatus(rs(), tp())
    expect(out.split('\n')).toHaveLength(3)
  })

  it('runStatus reads real fixtures and prints', () => {
    const dir = resolve(__dirname, 'fixtures/.test-status')
    mkdirSync(resolve(dir, '.agent'), { recursive: true })
    writeFileSync(resolve(dir, '.agent/RUN_STATE.json'), JSON.stringify(rs({ phase: 'FIXTURE_TEST' })))
    writeFileSync(resolve(dir, '.agent/CURRENT_TASK.md'),
      '# Current Task\n## Task ID\nT-FIX\n## Title\n夹具\n## Specification\nx\n## File Scope\n- a\n## Definition of DoD\n- [ ] ok\n## Acceptance Checks\nx\n## Stop Rule\nx')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    runStatus(dir)
    expect(spy.mock.calls[0][0]).toContain('当前阶段: FIXTURE_TEST')
    spy.mockRestore()
    rmSync(dir, { recursive: true, force: true })
  })
})
