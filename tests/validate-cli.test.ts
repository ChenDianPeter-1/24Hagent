import { describe, expect, it, vi } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getValidationRuntimePaths, runValidatePlan } from '../src/cli/validate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

describe('validate CLI runtime paths', () => {
  it('uses .aegis quality gates', () => {
    const dir = resolve(__dirname, 'fixtures/.test-validate-aegis')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(resolve(dir, '.aegis/config'), { recursive: true })
    writeFileSync(resolve(dir, '.aegis/config/quality-gates.json'), JSON.stringify(gates))

    const paths = getValidationRuntimePaths(dir)

    expect(paths.runtimeKind).toBe('aegis')
    expect(paths.qualityGatesPath).toBe(resolve(dir, '.aegis/config/quality-gates.json'))
    expect(paths.reportPath).toBe(resolve(dir, '.aegis/current/validation-report.md'))

    rmSync(dir, { recursive: true, force: true })
  })

  it('validate:plan prints the active .aegis gate path and all four gates', () => {
    const dir = resolve(__dirname, 'fixtures/.test-validate-plan')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(resolve(dir, '.aegis/config'), { recursive: true })
    writeFileSync(resolve(dir, '.aegis/config/quality-gates.json'), JSON.stringify(gates))

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    runValidatePlan(dir)
    const output = spy.mock.calls.map((call) => call[0]).join('\n')

    expect(output).toContain('.aegis')
    expect(output).toContain('test')
    expect(output).toContain('lint')
    expect(output).toContain('typecheck')
    expect(output).toContain('coverage')

    spy.mockRestore()
    rmSync(dir, { recursive: true, force: true })
  })
})
