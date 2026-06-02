import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { getTaskReviewRuntimePaths, runTaskReview } from '../src/cli/task-review.js'

const validTask = [
  '# Current Task',
  '',
  '## Task ID',
  'T-001',
  '',
  '## Title',
  'Review task runtime paths',
  '',
  '## Specification',
  'Use Aegis current task as the task quality gate input.',
  '',
  '## File Scope',
  '- src/cli/task-review.ts',
  '',
  '## Definition of DoD',
  '- [ ] task review reads the Aegis current task when present',
  '- [ ] task review writes the Aegis task quality report when present',
  '',
  '## Acceptance Checks',
  'npm test',
  '',
  '## Stop Rule',
  'Stop and ask if the task review needs files outside File Scope.'
].join('\n')

function write(path: string, content: string, root: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('task:review runtime paths', () => {
  it('prefers .aegis current task and report paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-task-review-'))
    try {
      write('.aegis/current/current-task.md', validTask, root)

      const paths = getTaskReviewRuntimePaths(root)

      expect(paths.runtimeKind).toBe('aegis')
      expect(paths.currentTaskPath).toBe(join(root, '.aegis/current/current-task.md'))
      expect(paths.reportPath).toBe(join(root, '.aegis/current/task-quality-report.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('falls back to legacy .agent task paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-task-review-'))
    try {
      const paths = getTaskReviewRuntimePaths(root)

      expect(paths.runtimeKind).toBe('legacy-agent')
      expect(paths.currentTaskPath).toBe(join(root, '.agent/CURRENT_TASK.md'))
      expect(paths.reportPath).toBe(join(root, '.agent/TASK_QUALITY_REPORT.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('task:review writes the report to .aegis current when active', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-task-review-'))
    try {
      write('.aegis/current/current-task.md', validTask, root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runTaskReview(root)

      const report = readFileSync(join(root, '.aegis/current/task-quality-report.md'), 'utf-8')
      expect(report).toContain('# Task Quality Gate')
      expect(report).toContain('Verdict: PASS')
      expect(process.exitCode).toBe(0)
      spy.mockRestore()
    } finally {
      process.exitCode = undefined
      rmSync(root, { recursive: true, force: true })
    }
  })
})
