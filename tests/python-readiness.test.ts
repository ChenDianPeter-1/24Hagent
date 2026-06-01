import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectPythonToolchain, classifyReadiness, renderReadinessReport } from '../src/core/quality/readiness-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf-8')

describe('detectPythonToolchain', () => {
  const toml = read('fixtures/python/pyproject.toml')

  it('detects pytest as test runner', () => {
    const tc = detectPythonToolchain(toml, 'pip')
    expect(tc.testRunner).toBe('pytest')
    expect(tc.testCommand).toBe('pytest')
    expect(tc.projectTypes).toContain('python')
    expect(tc.coverageProfile).toBe('coverage_py')
  })

  it('detects ruff as linter', () => {
    const tc = detectPythonToolchain(toml, 'pip')
    expect(tc.linter).toBe('ruff')
    expect(tc.lintCommand).toBe('ruff check .')
  })

  it('detects mypy as typechecker', () => {
    const tc = detectPythonToolchain(toml, 'pip')
    expect(tc.typechecker).toBe('mypy')
    expect(tc.typecheckCommand).toBe('mypy src/')
  })

  it('detects pytest-cov as coverage tool', () => {
    const tc = detectPythonToolchain(toml, 'pip')
    expect(tc.coverageTool).toBe('pytest-cov')
    expect(tc.coverageCommand).toBe('pytest --cov --cov-report=json')
  })

  it('confidence is high when pytest found', () => {
    const tc = detectPythonToolchain(toml, 'pip')
    expect(tc.confidence).toBe('high')
  })

  it('accepts custom package manager', () => {
    const tc = detectPythonToolchain(toml, 'uv')
    expect(tc.packageManager).toBe('uv')
  })

  it('warns when no tools found', () => {
    const empty = '[project]\nname = "empty"\n'
    const tc = detectPythonToolchain(empty, 'pip')
    expect(tc.testRunner).toBeNull()
    expect(tc.linter).toBeNull()
    expect(tc.typechecker).toBeNull()
    expect(tc.warnings.length).toBeGreaterThan(0)
    expect(tc.confidence).toBe('medium')
  })

  it('detects tools from nested tool sections', () => {
    const nestedToml = `[tool.pytest.ini_options]\ntestpaths = ["tests"]\n[tool.ruff.lint]\nselect = ["E", "F"]`
    const tc = detectPythonToolchain(nestedToml, 'pip')
    // pytest config found (no dep, but tool section exists)
    expect(tc.testEvidence).toContain('config found')
  })

  it('Poetry-style dependencies', () => {
    const poetryToml = `[tool.poetry.group.dev.dependencies]\npytest = "^8.0"\nruff = "^0.3"\n`
    const tc = detectPythonToolchain(poetryToml, 'pip')
    expect(tc.testRunner).toBe('pytest')
    expect(tc.linter).toBe('ruff')
  })
})

describe('classifyReadiness for Python', () => {
  it('READY when all Python tools detected', () => {
    const toml = read('fixtures/python/pyproject.toml')
    const tc = detectPythonToolchain(toml, 'pip')
    // Simplified: skip compareGates and go straight to classifyReadiness
    const audit = [
      { gate: 'test', currentCommand: 'pytest', suggestedCommand: 'pytest', match: 'MATCH' as const },
      { gate: 'lint', currentCommand: 'ruff check .', suggestedCommand: 'ruff check .', match: 'MATCH' as const },
      { gate: 'typecheck', currentCommand: 'mypy src/', suggestedCommand: 'mypy src/', match: 'MATCH' as const },
      { gate: 'coverage', currentCommand: 'pytest --cov --cov-report=json', suggestedCommand: 'pytest --cov --cov-report=json', match: 'MATCH' as const }
    ]
    const r = classifyReadiness(audit, tc)
    expect(r.verdict).toBe('READY')
    expect(r.blockingIssues).toHaveLength(0)
  })

  it('BLOCKED when Python tools missing', () => {
    const empty = '[project]\nname = "empty"\n'
    const tc = detectPythonToolchain(empty, 'pip')
    const r = classifyReadiness([], tc)
    expect(r.verdict).toBe('BLOCKED')
    expect(r.blockingIssues.length).toBeGreaterThan(0)
  })
})

describe('renderReadinessReport for Python', () => {
  it('shows Python-specific next steps when BLOCKED', () => {
    const empty = '[project]\nname = "empty"\n'
    const tc = detectPythonToolchain(empty, 'pip')
    const r = classifyReadiness([], tc)
    const report = renderReadinessReport(r)
    expect(report).toContain('pip install pytest pytest-cov')
    expect(report).toContain('pip install ruff')
    expect(report).toContain('pip install mypy')
    expect(report).not.toContain('npm install')
  })
})
