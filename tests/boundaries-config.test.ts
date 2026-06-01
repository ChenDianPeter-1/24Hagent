import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname!, '..')
const violationFile = resolve(root, 'src/core/schemas/__boundary_violation_test__.ts')

function writeViolationFile(): void {
  writeFileSync(violationFile, "import '../review/prompt-builder.ts'\nexport const bad = true\n", 'utf-8')
}

describe('eslint architecture boundaries', () => {
  afterEach(() => {
    rmSync(violationFile, { force: true })
  })

  it('fails lint when schema code imports review implementation', () => {
    writeViolationFile()

    try {
      execFileSync(process.execPath, [
        resolve(root, 'node_modules/eslint/bin/eslint.js'),
        '--config',
        resolve(root, 'eslint.config.mjs'),
        violationFile
      ], {
        cwd: root,
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      throw new Error('Expected ESLint to fail')
    } catch (error) {
      const output = error instanceof Error && 'stderr' in error
        ? `${String(error.stderr)}\n${String('stdout' in error ? error.stdout : '')}`
        : String(error)
      expect(output).toContain('boundaries/dependencies')
    }
  })
})
