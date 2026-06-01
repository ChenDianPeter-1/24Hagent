import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildReviewEvidence } from '../src/core/review/evidence-builder.js'

let root: string

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf-8' })
}

function write(path: string, content: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

function writeTask(fileScope: string[] = ['src']): void {
  write('.agent/CURRENT_TASK.md', [
    '## Task ID',
    'T-001',
    '',
    '## Title',
    'Scoped review',
    '',
    '## Specification',
    'Only review scoped files.',
    '',
    '## File Scope',
    ...fileScope.map(path => `- ${path}`),
    '',
    '## Definition of DoD',
    '- [ ] prompt includes validation report',
    '- [ ] diff is scoped',
    '',
    '## Acceptance Checks',
    '```bash',
    'npm test',
    '```',
    '',
    '## Stop Rule',
    'Stop if files are outside scope.'
  ].join('\n'))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), '24hagent-evidence-'))
  git(['init'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test User'])
  writeTask()
  write('.agent/WORK_REPORT.md', 'Implemented scoped review.')
  write('.agent/VALIDATION_REPORT.md', 'Validation passed.')
  write('.agent/CODEX_REVIEW_RUBRIC.md', 'Return YAML verdict.')
  write('src/allowed.ts', 'export const value = 1\n')
  git(['add', '.'])
  git(['commit', '-m', 'initial'])
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('buildReviewEvidence', () => {
  it('builds a review evidence packet with validation report and scoped diff', () => {
    write('src/allowed.ts', 'export const value = 2\n')

    const evidence = buildReviewEvidence(root)

    expect(evidence.task.task_id).toBe('T-001')
    expect(evidence.validationReport).toContain('Validation passed.')
    expect(evidence.changedFiles).toEqual(['src/allowed.ts'])
    expect(evidence.scopedDiff).toContain('diff --git a/src/allowed.ts b/src/allowed.ts')
  })

  it('blocks changed files outside file_scope', () => {
    write('src/allowed.ts', 'export const value = 2\n')
    write('docs/outside.md', 'outside scope\n')

    expect(() => buildReviewEvidence(root)).toThrow(/outside current task file_scope/)
  })

  it('blocks when changed file count exceeds the configured limit', () => {
    write('src/one.ts', 'export const one = 1\n')
    write('src/two.ts', 'export const two = 2\n')

    expect(() => buildReviewEvidence(root, { maxChangedFiles: 1 })).toThrow(/changed files count/)
  })

  it('blocks when scoped diff exceeds the configured line limit', () => {
    write('src/allowed.ts', Array.from({ length: 25 }, (_, i) => `export const v${i} = ${i}`).join('\n'))

    expect(() => buildReviewEvidence(root, { maxDiffLines: 5 })).toThrow(/scoped diff has/)
  })
})
