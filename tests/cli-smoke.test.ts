import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = (args: string) => `node ${resolve(root, 'dist/cli/main.js')} ${args}`

describe('CLI smoke', () => {
  it('default aegis invocation refreshes Aegis status', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-default-'))
    try {
      mkdirSync(resolve(dir, '.aegis/state'), { recursive: true })
      mkdirSync(resolve(dir, '.aegis/current'), { recursive: true })
      mkdirSync(resolve(dir, '.aegis/blueprint'), { recursive: true })
      writeFileSync(resolve(dir, '.aegis/state/run-state.json'), JSON.stringify({
        schema_version: 1,
        project_id: 'aegis-rewrite',
        task_id: 'T-DEFAULT',
        phase: 'codex-review',
        mode: 'auto',
        last_verdict: 'PASS',
        retry_count: 0,
        updated_at: '2026-06-03T01:30:00+08:00'
      }))
      writeFileSync(resolve(dir, '.aegis/current/current-task.md'),
        '# Current Task\n\n## Title\nDefault Aegis entrypoint\n')
      writeFileSync(resolve(dir, '.aegis/blueprint/project-blueprint.md'),
        '# Blueprint\n\n## Product Goal\nRewrite 24Hagent into Aegis.\n')

      const out = execSync(cli(''), { encoding: 'utf-8', cwd: dir })

      expect(out).toContain('# Aegis Status')
      expect(out).toContain('`codex-review`')
      expect(out).toContain('Default Aegis entrypoint')
      expect(out).toContain('aegis review:prompt')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('readiness reports READY on root project', () => {
    const out = execSync(cli('readiness'), { encoding: 'utf-8', cwd: root })
    expect(out).toContain('**READY**')
  })

  it('validate:plan lists all 4 gates', () => {
    const out = execSync(cli('validate:plan'), { encoding: 'utf-8', cwd: root })
    expect(out).toContain('test')
    expect(out).toContain('lint')
    expect(out).toContain('typecheck')
    expect(out).toContain('coverage')
  })

  it('review:render outputs PASS from fixture', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-review-render-'))
    const fixture = resolve(root, 'tests/fixtures/codex-review-pass.jsonl')
    try {
      mkdirSync(resolve(dir, '.aegis/state'), { recursive: true })
      mkdirSync(resolve(dir, '.aegis/current'), { recursive: true })
      writeFileSync(resolve(dir, '.aegis/current/current-task.md'), '# Current Task\n')
      writeFileSync(resolve(dir, '.aegis/state/run-state.json'), JSON.stringify({
        schema_version: 1,
        project_id: 'aegis-rewrite',
        task_id: 'T-RENDER',
        phase: 'codex-review',
        mode: 'auto',
        last_verdict: null,
        retry_count: 0,
        updated_at: '2026-06-03T01:30:00+08:00'
      }))

      const out = execSync(cli(`review:render --input ${fixture}`), { encoding: 'utf-8', cwd: dir })

      expect(out).toContain('PASS')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
