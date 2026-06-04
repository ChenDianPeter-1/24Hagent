import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReviewRuntimePaths, runReviewRender } from '../src/cli/review.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = resolve(__dirname, 'fixtures/codex-review-pass.jsonl')
const needFixFixture = resolve(__dirname, 'fixtures/codex-review-need-fix.jsonl')
const needHumanFixture = resolve(__dirname, 'fixtures/codex-review-need-human.jsonl')

function write(path: string, content: string, root: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('review CLI runtime paths', () => {
  it('uses .aegis review artifacts', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      write('.aegis/current/current-task.md', '# Current Task\n', root)

      const paths = getReviewRuntimePaths(root)

      expect(paths.runtimeKind).toBe('aegis')
      expect(paths.promptPath).toBe(join(root, '.aegis/current/codex-review-prompt.md'))
      expect(paths.rawReviewPath).toBe(join(root, '.aegis/current/codex-review.jsonl'))
      expect(paths.renderedReviewPath).toBe(join(root, '.aegis/current/codex-review.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('review:render writes rendered output to .aegis current by default', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      write('.aegis/current/current-task.md', '# Current Task\n', root)
      write('.aegis/state/run-state.json', JSON.stringify({
        schema_version: 1,
        project_id: 'test',
        task_id: 'T-001',
        phase: 'codex-review',
        mode: 'auto',
        last_verdict: null,
        retry_count: 0,
        updated_at: '2026-06-03T00:00:00+08:00'
      }), root)
      write('.aegis/current/codex-review.jsonl', readFileSync(fixture, 'utf-8'), root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runReviewRender(root)

      const rendered = readFileSync(join(root, '.aegis/current/codex-review.md'), 'utf-8')
      const state = JSON.parse(readFileSync(join(root, '.aegis/state/run-state.json'), 'utf-8'))
      expect(rendered).toContain('PASS')
      expect(rendered).toContain('.aegis')
      expect(state.phase).toBe('passed')
      expect(state.last_verdict).toBe('PASS')
      spy.mockRestore()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('review:render turns NEED_FIX into bounded repair instruction', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      write('.aegis/current/current-task.md', '# Current Task\n', root)
      write('.aegis/state/run-state.json', JSON.stringify({
        schema_version: 1,
        project_id: 'test',
        task_id: 'T-001',
        phase: 'codex-review',
        mode: 'auto',
        last_verdict: null,
        retry_count: 0,
        updated_at: '2026-06-03T00:00:00+08:00'
      }), root)
      write('.aegis/current/codex-review.jsonl', readFileSync(needFixFixture, 'utf-8'), root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runReviewRender(root)

      const state = JSON.parse(readFileSync(join(root, '.aegis/state/run-state.json'), 'utf-8'))
      const instruction = readFileSync(join(root, '.aegis/current/work-instruction.md'), 'utf-8')
      expect(state.phase).toBe('need-fix')
      expect(state.last_verdict).toBe('NEED_FIX')
      expect(state.retry_count).toBe(1)
      expect(instruction).toContain('Add test for empty input')
      expect(instruction).toContain('stay inside `current-task.md` file scope')
      spy.mockRestore()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('review:render turns NEED_HUMAN into human handoff', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      write('.aegis/current/current-task.md', '# Current Task\n', root)
      write('.aegis/state/run-state.json', JSON.stringify({
        schema_version: 1,
        project_id: 'test',
        task_id: 'T-001',
        phase: 'codex-review',
        mode: 'auto',
        last_verdict: null,
        retry_count: 0,
        updated_at: '2026-06-03T00:00:00+08:00'
      }), root)
      write('.aegis/current/codex-review.jsonl', readFileSync(needHumanFixture, 'utf-8'), root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runReviewRender(root)

      const state = JSON.parse(readFileSync(join(root, '.aegis/state/run-state.json'), 'utf-8'))
      const handoff = readFileSync(join(root, '.aegis/current/human-handoff.md'), 'utf-8')
      expect(state.phase).toBe('human-handoff')
      expect(state.last_verdict).toBe('NEED_HUMAN')
      expect(handoff).toContain('Which approach?')
      expect(handoff).toContain('Claude Code must wait for human direction')
      spy.mockRestore()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
