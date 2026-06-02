import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  buildSuperpowerSourceManifest,
  checkSuperpowerDisciplineSources,
  renderDisciplineReport,
  renderSuperpowerSummary
} from '../src/core/superpower/sources.js'

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

describe('Superpower source manifest', () => {
  it('records key Superpower repository, guideline, and skill sources', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-superpower-'))
    try {
      write('README.md', '# Superpowers\n\nMethodology.', root)
      write('CLAUDE.md', '# Superpowers Contributor Guidelines\n\nRules.', root)
      for (const skill of requiredSkills) {
        write(`skills/${skill}/SKILL.md`, `# ${skill}\n\nSkill body.`, root)
      }

      const manifest = buildSuperpowerSourceManifest(root, '2026-06-03T01:50:00+08:00')
      const result = checkSuperpowerDisciplineSources(manifest)
      const summary = renderSuperpowerSummary(manifest)
      const report = renderDisciplineReport(result, manifest)

      expect(manifest.sources.map(source => source.name)).toContain('Superpowers README')
      expect(manifest.sources.map(source => source.name)).toContain('brainstorming')
      expect(result.verdict).toBe('PASS')
      expect(summary).toContain('Aegis Boundary')
      expect(report).toContain('Verdict: PASS')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('fails discipline source check when required skills are missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-superpower-'))
    try {
      write('README.md', '# Superpowers\n', root)
      write('skills/brainstorming/SKILL.md', '# brainstorming\n', root)

      const manifest = buildSuperpowerSourceManifest(root, '2026-06-03T01:50:00+08:00')
      const result = checkSuperpowerDisciplineSources(manifest)

      expect(result.verdict).toBe('NEED_FIX')
      expect(result.missingSkills).toContain('writing-plans')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
