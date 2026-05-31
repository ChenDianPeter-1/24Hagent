import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = (args: string) => `node ${resolve(root, 'dist/cli/main.js')} ${args}`

describe('CLI smoke', () => {
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
    const fixture = resolve(root, 'tests/fixtures/codex-review-pass.jsonl')
    const out = execSync(cli(`review:render --input ${fixture}`), { encoding: 'utf-8', cwd: root })
    expect(out).toContain('PASS')
  })
})
