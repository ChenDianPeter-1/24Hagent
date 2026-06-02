import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { getReadinessRuntimePaths, runReadiness } from '../src/cli/readiness.js'

const packageJson = {
  scripts: {
    test: 'vitest run',
    lint: 'eslint src/ tests/',
    typecheck: 'tsc --noEmit',
    coverage: 'vitest run --coverage'
  },
  devDependencies: {
    vitest: '^2.1.0',
    eslint: '^10.4.1',
    typescript: '^5.6.0'
  }
}

const gates = {
  gates: {
    test: { enabled: true, command: 'npm test', blocking: true, description: 'test' },
    lint: { enabled: true, command: 'npm run lint', blocking: true, description: 'lint' },
    typecheck: { enabled: true, command: 'npm run typecheck', blocking: true, description: 'typecheck' },
    coverage: {
      enabled: true,
      command: 'npm run coverage',
      blocking: true,
      description: 'coverage',
      threshold: { lines: 100, branches: 100, functions: 100, statements: 100 }
    }
  }
}

function write(path: string, content: string, root: string): void {
  const fullPath = join(root, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('readiness CLI runtime paths', () => {
  it('prefers .aegis quality gates and readiness report path', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-readiness-'))
    try {
      write('.aegis/config/quality-gates.json', JSON.stringify(gates), root)

      const paths = getReadinessRuntimePaths(root)

      expect(paths.runtimeKind).toBe('aegis')
      expect(paths.qualityGatesPath).toBe(join(root, '.aegis/config/quality-gates.json'))
      expect(paths.reportPath).toBe(join(root, '.aegis/current/quality-readiness-report.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('falls back to legacy .agent readiness paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-readiness-'))
    try {
      const paths = getReadinessRuntimePaths(root)

      expect(paths.runtimeKind).toBe('legacy-agent')
      expect(paths.qualityGatesPath).toBe(join(root, '.agent/QUALITY_GATES.json'))
      expect(paths.reportPath).toBe(join(root, '.agent/QUALITY_READINESS_REPORT.md'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('readiness writes report to .aegis current when active', () => {
    const root = mkdtempSync(join(tmpdir(), 'aegis-readiness-'))
    try {
      write('package.json', JSON.stringify(packageJson), root)
      write('.aegis/config/quality-gates.json', JSON.stringify(gates), root)
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      runReadiness(root)

      const report = readFileSync(join(root, '.aegis/current/quality-readiness-report.md'), 'utf-8')
      expect(report).toContain('# Quality Readiness Report')
      expect(report).toContain('**READY**')
      expect(process.exitCode).toBe(0)
      spy.mockRestore()
    } finally {
      process.exitCode = undefined
      rmSync(root, { recursive: true, force: true })
    }
  })
})
