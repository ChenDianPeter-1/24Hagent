import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReviewRuntimePaths, runReviewRender } from '../src/cli/review.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = resolve(__dirname, 'fixtures/codex-review-pass.jsonl')

function write(path: string, content: string, root: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('review CLI runtime paths', () => {
  it('prefers .aegis review artifacts when current task exists', () => {
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

  it('falls back to legacy .agent review artifacts', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      const paths = getReviewRuntimePaths(root)

      expect(paths.runtimeKind).toBe('legacy-agent')
      expect(paths.promptPath).toBe(join(root, '.agent/codex-review-prompt.md'))
      expect(paths.rawReviewPath).toBe(join(root, '.agent/codex-review-raw.jsonl'))
      expect(paths.renderedReviewPath).toBe(join(root, '.agent/CODEX_REVIEW.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('review:render writes rendered output to .aegis current by default', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-review-cli-'))
    try {
      write('.aegis/current/current-task.md', '# Current Task\n', root)
      write('.aegis/current/codex-review.jsonl', readFileSync(fixture, 'utf-8'), root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runReviewRender(root)

      const rendered = readFileSync(join(root, '.aegis/current/codex-review.md'), 'utf-8')
      expect(rendered).toContain('PASS')
      expect(rendered).toContain('.aegis')
      spy.mockRestore()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
