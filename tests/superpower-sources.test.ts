import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  buildSuperpowerSourceManifest,
  checkSuperpowerDiscipline,
  checkSuperpowerDisciplineSources,
  collectRoundDisciplineEvidence,
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
      write('planning-evidence.md', 'Planned scope and task sequence for this round.', root)
      write('tdd-evidence.md', 'Added failing tests first, then made the implementation pass.', root)
      write('verification-evidence.md', 'Ran typecheck, build, lint, and the full test suite.', root)
      write('review-evidence.md', 'Reviewed the diff against scope and acceptance checks.', root)

      const manifest = buildSuperpowerSourceManifest(root, '2026-06-03T01:50:00+08:00')
      const evidence = collectRoundDisciplineEvidence(root, 'Implement a new feature.')
      const result = checkSuperpowerDiscipline(manifest, evidence)
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

  it('fails discipline check when round evidence is missing even if sources exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-superpower-'))
    try {
      for (const skill of requiredSkills) {
        write(`skills/${skill}/SKILL.md`, `# ${skill}\n\nSkill body.`, root)
      }

      const manifest = buildSuperpowerSourceManifest(root, '2026-06-03T01:50:00+08:00')
      const sourceOnly = checkSuperpowerDisciplineSources(manifest)
      const evidence = collectRoundDisciplineEvidence(root, 'Implement a new feature.')
      const discipline = checkSuperpowerDiscipline(manifest, evidence)
      const report = renderDisciplineReport(discipline, manifest)

      expect(sourceOnly.verdict).toBe('PASS')
      expect(discipline.verdict).toBe('NEED_FIX')
      expect(report).toContain('MISSING: Planning evidence')
      expect(report).toContain('MISSING: TDD or test-first evidence')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('requires debugging evidence for bug-fix rounds', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-superpower-'))
    try {
      write('planning-evidence.md', 'Reproduced the bug and planned a scoped repair.', root)
      write('verification-evidence.md', 'Ran regression tests and full validation before completion.', root)
      write('review-evidence.md', 'Reviewed the fix against the failing scenario and scope.', root)

      const evidence = collectRoundDisciplineEvidence(root, 'Fix a regression in validation routing.')

      expect(evidence.find(item => item.category === 'debugging')?.required).toBe(true)
      expect(evidence.find(item => item.category === 'debugging')?.present).toBe(false)
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
