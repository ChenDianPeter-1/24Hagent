import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runDisciplineCheck, runSuperpowerScan } from '../src/cli/superpower.js'

const requiredSkills = [
  'brainstorming',
  'writing-plans',
  'test-driven-development',
  'systematic-debugging',
  'requesting-code-review',
  'verification-before-completion',
  'using-git-worktrees',
  'finishing-a-development-branch'
]

function write(path: string, content: string, root: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('Superpower CLI integration', () => {
  it('scans configured Superpower path and writes Aegis runtime artifacts', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-superpower-cli-'))
    const superpowerRoot = mkdtempSync(join(tmpdir(), 'aegis-superpowers-'))
    try {
      write('.aegis/config/aegis.json', JSON.stringify({
        schema_version: 1,
        superpower: { local_path_hint: superpowerRoot }
      }), root)
      write('README.md', '# Superpowers\n', superpowerRoot)
      write('CLAUDE.md', '# Guidelines\n', superpowerRoot)
      for (const skill of requiredSkills) {
        write(`skills/${skill}/SKILL.md`, `# ${skill}\n`, superpowerRoot)
      }
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runSuperpowerScan(root)
      runDisciplineCheck(root)

      const manifest = readFileSync(join(root, '.aegis/current/superpower-sources.json'), 'utf-8')
      const report = readFileSync(join(root, '.aegis/current/discipline-report.md'), 'utf-8')
      expect(manifest).toContain('brainstorming')
      expect(report).toContain('Verdict: PASS')
      expect(process.exitCode).toBe(0)
      spy.mockRestore()
    } finally {
      process.exitCode = undefined
      rmSync(root, { recursive: true, force: true })
      rmSync(superpowerRoot, { recursive: true, force: true })
    }
  })
})
