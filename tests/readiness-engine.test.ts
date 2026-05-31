import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  detectToolchain, identifyPlaceholder, compareGates,
  classifyReadiness, renderReadinessReport, computeReadinessExitCode
} from '../src/core/quality/readiness-engine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => JSON.parse(readFileSync(resolve(__dirname, p), 'utf-8'))

describe('identifyPlaceholder', () => {
  it('null/empty is placeholder', () => {
    expect(identifyPlaceholder(undefined)).toBe(true)
    expect(identifyPlaceholder('')).toBe(true)
  })
  it('npm default placeholder', () => {
    expect(identifyPlaceholder('echo "Error: no test specified" && exit 1')).toBe(true)
  })
  it('real vitest command is not placeholder', () => {
    expect(identifyPlaceholder('vitest run')).toBe(false)
  })
  it('echo without runner is placeholder', () => {
    expect(identifyPlaceholder('echo "hello"')).toBe(true)
  })
  it('exit 1 without runner is placeholder', () => {
    expect(identifyPlaceholder('some command && exit 1')).toBe(true)
  })
  it('exit 1 with vitest is not placeholder', () => {
    expect(identifyPlaceholder('vitest run && exit 1')).toBe(false)
  })
  it('echo with vitest is not placeholder', () => {
    expect(identifyPlaceholder('echo starting && vitest run')).toBe(false)
  })
})

describe('detectToolchain', () => {
  it('detects root project as READY', () => {
    const pkg = read('fixtures/ps1-golden/readiness/package.json')
    const tc = detectToolchain(pkg)
    expect(tc.testRunner).toBe('vitest')
    expect(tc.linter).toBe('eslint')
    expect(tc.typechecker).toBe('tsc')
    expect(tc.coverageTool).toBe('vitest built-in')
    expect(tc.packageManager).toBe('npm')
  })

  it('detects blocked placeholder project', () => {
    const pkg = read('fixtures/ps1-golden/readiness/blocked-package.json')
    const tc = detectToolchain(pkg)
    expect(tc.testRunner).toBeNull()
    expect(identifyPlaceholder(tc.testCommand ?? undefined)).toBe(true)
  })
})

describe('classifyReadiness', () => {
  it('READY for root project', () => {
    const pkg = read('fixtures/ps1-golden/readiness/package.json')
    const gates = read('fixtures/ps1-golden/readiness/QUALITY_GATES.json')
    const tc = detectToolchain(pkg)
    const audit = compareGates(tc, gates.gates)
    const r = classifyReadiness(audit, tc)
    expect(r.verdict).toBe('READY')
    expect(r.blockingIssues).toHaveLength(0)
  })

  it('NEEDS_CONFIG when gate commands mismatch', () => {
    const pkg = read('fixtures/ps1-golden/readiness/package.json')
    const gates = { test: { command: 'npm test', enabled: true }, lint: { command: 'npm run lint', enabled: true }, typecheck: { command: 'npm run typecheck', enabled: true }, coverage: { command: 'npm run coverage', enabled: true } }
    const tc = detectToolchain(pkg)
    const audit = compareGates(tc, gates)
    // test gate has 'npm test' but suggested is 'npm run test' → MISMATCH
    expect(audit[0].match).toBe('MISMATCH')
    const r = classifyReadiness(audit, tc)
    expect(r.verdict).toBe('NEEDS_CONFIG')
  })

  it('BLOCKED for placeholder project', () => {
    const pkg = read('fixtures/ps1-golden/readiness/blocked-package.json')
    const gates = read('fixtures/ps1-golden/readiness/blocked-gates.json')
    const tc = detectToolchain(pkg)
    const audit = compareGates(tc, gates.gates)
    const r = classifyReadiness(audit, tc)
    expect(r.verdict).toBe('BLOCKED')
    expect(r.blockingIssues.length).toBeGreaterThan(0)
  })
})

describe('renderReadinessReport', () => {
  it('matches golden output structure', () => {
    const pkg = read('fixtures/ps1-golden/readiness/package.json')
    const gates = read('fixtures/ps1-golden/readiness/QUALITY_GATES.json')
    const tc = detectToolchain(pkg)
    const audit = compareGates(tc, gates.gates)
    const r = classifyReadiness(audit, tc)
    const report = renderReadinessReport(r)

    expect(report).toContain('# Quality Readiness Report')
    expect(report).toContain('## Project Detection')
    expect(report).toContain('## QUALITY_GATES.json Command Audit')
    expect(report).toContain('## Readiness Verdict')
    expect(report).toContain('**READY**')
    expect(report).toContain('vitest')
    expect(report).toContain('eslint')
    expect(report).toContain('tsc')
  })

  it('BLOCKED report has blocking issues section', () => {
    const pkg = read('fixtures/ps1-golden/readiness/blocked-package.json')
    const gates = read('fixtures/ps1-golden/readiness/blocked-gates.json')
    const tc = detectToolchain(pkg)
    const audit = compareGates(tc, gates.gates)
    const r = classifyReadiness(audit, tc)
    const report = renderReadinessReport(r)

    expect(report).toContain('**BLOCKED**')
    expect(report).toContain('## Blocking Issues')
  })
})

describe('renderReadinessReport edge cases', () => {
  it('NEEDS_CONFIG report', () => {
    const pkg = read('fixtures/ps1-golden/readiness/package.json')
    const tc = detectToolchain(pkg)
    // mismatched gate
    const gates = { test: { command: 'npm test', enabled: true }, lint: { command: 'npm run lint', enabled: true }, typecheck: { command: 'npm run typecheck', enabled: true }, coverage: { command: 'npm run coverage', enabled: true } }
    const audit = compareGates(tc, gates)
    const r = classifyReadiness(audit, tc)
    const report = renderReadinessReport(r)
    expect(report).toContain('**NEEDS_CONFIG**')
    expect(report).not.toContain('## Blocking Issues')
  })

  it('toolchain with warning', () => {
    const pkg = { scripts: { test: 'node run-tests.js' } }
    const tc = detectToolchain(pkg)
    expect(tc.warnings.length).toBeGreaterThan(0)
    const audit = compareGates(tc, { test: { command: 'npm test', enabled: true } })
    const r = classifyReadiness(audit, tc)
    const report = renderReadinessReport(r)
    expect(report).toContain('## Detection Warnings')
  })
})

describe('computeReadinessExitCode', () => {
  it('READY = 0', () => expect(computeReadinessExitCode('READY')).toBe(0))
  it('NEEDS_CONFIG = 0', () => expect(computeReadinessExitCode('NEEDS_CONFIG')).toBe(0))
  it('BLOCKED = 1', () => expect(computeReadinessExitCode('BLOCKED')).toBe(1))
})
