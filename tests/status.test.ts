import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatAegisStatus, formatStatus, runStatus } from '../src/cli/status.js'
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

  it('formats Aegis status from .aegis run state and task markdown', () => {
    const out = formatAegisStatus(
      {
        schema_version: 1,
        project_id: 'aegis-rewrite',
        task_id: 'T-AEGIS',
        phase: 'waiting-for-construction',
        mode: 'auto',
        last_verdict: 'PASS',
        round_count: 0,
        retry_count: 0,
        updated_at: '2026-06-02T20:50:00+08:00'
      },
      '# Current Task\n## Title\nWire status into Aegis runtime\n',
      '# Blueprint\n## Product Goal\nRewrite 24Hagent into Aegis.\n'
    )

    expect(out).toContain('# Aegis Status')
    expect(out).toContain('`waiting-for-construction`')
    expect(out).toContain('Wire status into Aegis runtime')
  })

  it('runStatus prefers .aegis and refreshes navigation files', () => {
    const dir = resolve(__dirname, 'fixtures/.test-aegis-status')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(resolve(dir, '.aegis/state'), { recursive: true })
    mkdirSync(resolve(dir, '.aegis/current'), { recursive: true })
    mkdirSync(resolve(dir, '.aegis/blueprint'), { recursive: true })

    writeFileSync(resolve(dir, '.aegis/state/run-state.json'), JSON.stringify({
      schema_version: 1,
      project_id: 'aegis-rewrite',
      task_id: 'T-AEGIS',
      phase: 'waiting-for-construction',
      mode: 'auto',
      last_verdict: 'PASS',
      retry_count: 0,
      updated_at: '2026-06-02T20:50:00+08:00'
    }))
    writeFileSync(resolve(dir, '.aegis/current/current-task.md'),
      '# Current Task\n## Title\nWire status into Aegis runtime\n')
    writeFileSync(resolve(dir, '.aegis/blueprint/project-blueprint.md'),
      '# Blueprint\n## Product Goal\nRewrite 24Hagent into Aegis.\n')

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    runStatus(dir)

    expect(spy.mock.calls[0][0]).toContain('# Aegis Status')
    expect(readFileSync(resolve(dir, '.aegis/current/status.md'), 'utf-8')).toContain('Wire status into Aegis runtime')
    expect(readFileSync(resolve(dir, '.aegis/current/work-instruction.md'), 'utf-8')).toContain('Do not exceed')
    expect(readFileSync(resolve(dir, '.aegis/blueprint/project-progress.md'), 'utf-8')).toContain('Rewrite 24Hagent into Aegis.')
    expect(existsSync(resolve(dir, '.agent'))).toBe(false)

    spy.mockRestore()
    rmSync(dir, { recursive: true, force: true })
  })
})
