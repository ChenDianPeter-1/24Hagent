import { describe, it, expect } from 'vitest'
import {
  parseCoverageFromRawOutput, evaluateThresholds,
  loadGateConfig, planGateExecutions, runConfiguredGates, evaluateGateResults
} from '../src/core/quality/validation-engine.js'
import { FakeCommandRunner } from '../src/adapters/shell/command-runner.js'
import type { GateConfig } from '../src/core/quality/validation-types.js'

const vitestJson = (pct: { lines?: number; branches?: number; functions?: number; statements?: number }) =>
  JSON.stringify({ total: {
    lines:      { total: 268, covered: 268, skipped: 0, pct: pct.lines ?? 100 },
    branches:   { total: 118, covered: 118, skipped: 0, pct: pct.branches ?? 100 },
    functions:  { total: 19,  covered: 19,  skipped: 0, pct: pct.functions ?? 100 },
    statements: { total: 268, covered: 268, skipped: 0, pct: pct.statements ?? 100 }
  }})

const t100 = { lines: 100, branches: 100, functions: 100, statements: 100 }

describe('parseCoverageFromRawOutput', () => {
  it('parses standard vitest JSON summary', () => {
    const c = parseCoverageFromRawOutput(vitestJson({}))
    expect(c.lines).toBe(100)
    expect(c.branches).toBe(100)
    expect(c.functions).toBe(100)
    expect(c.statements).toBe(100)
  })

  it('parses with ANSI codes and table prefix', () => {
    const raw = '\x1b[32m% Stmts\x1b[0m\n' + vitestJson({ lines: 95, branches: 90 } as Record<string, number>)
    const c = parseCoverageFromRawOutput(raw)
    expect(c.lines).toBe(95)
    expect(c.branches).toBe(90)
  })

  it('throws on empty string', () => {
    expect(() => parseCoverageFromRawOutput('')).toThrow('empty')
    expect(() => parseCoverageFromRawOutput('   ')).toThrow('empty')
  })

  it('throws on missing total field', () => {
    expect(() => parseCoverageFromRawOutput('{"foo":"bar"}')).toThrow('missing "total"')
  })

  it('throws when pct field is missing', () => {
    const bad = JSON.stringify({ total: { lines: { total: 1, covered: 1, skipped: 0 } } })
    expect(() => parseCoverageFromRawOutput(bad)).toThrow('missing total.lines.pct')
  })

  it('throws when pct is not a number', () => {
    const bad = JSON.stringify({ total: { lines: { pct: 'nope' }, branches: { pct: 100 }, functions: { pct: 100 }, statements: { pct: 100 } } })
    expect(() => parseCoverageFromRawOutput(bad)).toThrow('missing total.lines.pct')
  })

  it('throws on broken JSON', () => {
    expect(() => parseCoverageFromRawOutput('not json')).toThrow('Failed to parse')
  })
})

describe('evaluateThresholds', () => {
  it('all pass', () => {
    const r = evaluateThresholds({ lines: 100, branches: 100, functions: 100, statements: 100 }, t100)
    expect(r.overall).toBe(true)
    expect(r.metrics.every(m => m.pass)).toBe(true)
  })

  it('lines at 95% fails 100% threshold', () => {
    const r = evaluateThresholds({ lines: 95, branches: 100, functions: 100, statements: 100 }, t100)
    expect(r.overall).toBe(false)
    expect(r.metrics.find(m => m.name === 'lines')!.pass).toBe(false)
  })

  it('99.99 fails 100 threshold (no rounding)', () => {
    const r = evaluateThresholds({ lines: 99.99, branches: 100, functions: 100, statements: 100 }, t100)
    expect(r.overall).toBe(false)
    expect(r.metrics[0].pass).toBe(false)
  })

  it('exactly 100 passes 100 threshold', () => {
    const r = evaluateThresholds({ lines: 100, branches: 100, functions: 100, statements: 100 }, t100)
    expect(r.overall).toBe(true)
  })
})

// -- B3-2c: gate orchestration -----------------------------------------------

const rawCfg = (overrides?: Partial<Record<string, Partial<GateConfig>>>) => ({
  gates: {
    test:      { enabled: true,  command: 'npm run test',      blocking: true,  description: 't', ...overrides?.test },
    lint:      { enabled: true,  command: 'npm run lint',      blocking: true,  description: 'l', ...overrides?.lint },
    typecheck: { enabled: true,  command: 'npm run typecheck', blocking: true,  description: 'c', ...overrides?.typecheck },
    coverage:  { enabled: true,  command: 'npm run coverage',  blocking: true,
      description: 'cov', threshold: { lines: 100, branches: 100, functions: 100, statements: 100 }, ...overrides?.coverage }
  }
})

const vitestOut = (pct: number) => JSON.stringify({ total: {
  lines: { total: 1, covered: 1, skipped: 0, pct },
  branches: { total: 1, covered: 1, skipped: 0, pct },
  functions: { total: 1, covered: 1, skipped: 0, pct },
  statements: { total: 1, covered: 1, skipped: 0, pct }
}})

describe('loadGateConfig', () => {
  it('parses valid config with 4 gates in order', () => {
    const configs = loadGateConfig(rawCfg())
    expect(configs).toHaveLength(4)
    expect(configs[0].command).toBe('npm run test')
    expect(configs[3].command).toBe('npm run coverage')
    expect(configs[3].threshold).toEqual({ lines: 100, branches: 100, functions: 100, statements: 100 })
  })

  it('throws on missing test gate', () => {
    const bad = { gates: {} }
    expect(() => loadGateConfig(bad)).toThrow()
  })

  it('accepts coverage without threshold (optional)', () => {
    const configs = loadGateConfig(rawCfg({ coverage: { threshold: undefined } as Partial<GateConfig> }))
    expect(configs[3].threshold).toBeUndefined()
  })
})

describe('runConfiguredGates', () => {
  it('runs all enabled gates and returns results', async () => {
    const configs = loadGateConfig(rawCfg())
    const plans = planGateExecutions(configs)
    const runner = new FakeCommandRunner()
    runner.preset('npm run test', { exitCode: 0, stdout: 'ok', stderr: '' })
    runner.preset('npm run lint', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run typecheck', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run coverage', { exitCode: 0, stdout: vitestOut(100), stderr: '' })
    const results = await runConfiguredGates(plans, runner)
    expect(results).toHaveLength(4)
    expect(results.every(r => r.status === 'PASS')).toBe(true)
  })

  it('continues after gate failure', async () => {
    const configs = loadGateConfig(rawCfg())
    const plans = planGateExecutions(configs)
    const runner = new FakeCommandRunner()
    runner.preset('npm run test', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run lint', { exitCode: 1, stdout: '', stderr: 'lint error' })
    runner.preset('npm run typecheck', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run coverage', { exitCode: 0, stdout: vitestOut(100), stderr: '' })
    const results = await runConfiguredGates(plans, runner)
    expect(results[1].status).toBe('FAIL')
    expect(results[2].status).toBe('PASS')
  })

  it('skips disabled gate without calling runner', async () => {
    const cfg = rawCfg({ lint: { enabled: false } as Partial<GateConfig> })
    const configs = loadGateConfig(cfg)
    const plans = planGateExecutions(configs)
    const runner = new FakeCommandRunner()
    runner.preset('npm run test', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run typecheck', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run coverage', { exitCode: 0, stdout: vitestOut(100), stderr: '' })
    const results = await runConfiguredGates(plans, runner)
    expect(results).toHaveLength(4)
    expect(results[1].status).toBe('SKIPPED')
    expect(results[1].rawOutput).toBe('')
  })

  it('marks gate UNAVAILABLE when runner throws', async () => {
    const configs = loadGateConfig(rawCfg())
    const plans = planGateExecutions(configs)
    const runner = new FakeCommandRunner()
    runner.preset('npm run test', { exitCode: 0, stdout: '', stderr: '' })
    runner.preset('npm run coverage', { exitCode: 0, stdout: vitestOut(100), stderr: '' })
    // lint and typecheck not preset → runner throws
    const results = await runConfiguredGates(plans, runner)
    expect(results[1].status).toBe('UNAVAILABLE')
    expect(results[2].status).toBe('UNAVAILABLE')
    expect(results[0].status).toBe('PASS')
  })
})

describe('evaluateGateResults', () => {
  it('all PASS → overall PASS', () => {
    const configs = loadGateConfig(rawCfg())
    const results = configs.map((c, i) => ({
      name: ['test','lint','typecheck','coverage'][i],
      command: c.command, exitCode: 0, stdout: '', stderr: '',
      status: 'PASS' as const, rawOutput: i === 3 ? vitestOut(100) : ''
    }))
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('PASS')
    expect(v.blockingFailures).toHaveLength(0)
    expect(v.coverage).not.toBeNull()
  })

  it('blocking gate FAIL → overall FAIL', () => {
    const configs = loadGateConfig(rawCfg())
    const results = configs.map((c, i) => {
      const status: 'PASS' | 'FAIL' = i === 1 ? 'FAIL' : 'PASS'
      return {
        name: ['test','lint','typecheck','coverage'][i],
        command: c.command, exitCode: i === 1 ? 1 : 0, stdout: '', stderr: '',
        status, rawOutput: i === 3 ? vitestOut(100) : ''
      }
    })
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('FAIL')
    expect(v.blockingFailures.some(f => f.includes('lint'))).toBe(true)
  })

  it('non-blocking gate FAIL → still PASS', () => {
    const cfg = rawCfg({ lint: { blocking: false } as Partial<GateConfig> })
    const configs = loadGateConfig(cfg)
    const results = configs.map((c, i) => {
      const status: 'PASS' | 'FAIL' = i === 1 ? 'FAIL' : 'PASS'
      return {
        name: ['test','lint','typecheck','coverage'][i],
        command: c.command, exitCode: i === 1 ? 1 : 0, stdout: '', stderr: '',
        status, rawOutput: i === 3 ? vitestOut(100) : ''
      }
    })
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('PASS')
  })

  it('coverage parse failure → FAIL', () => {
    const configs = loadGateConfig(rawCfg())
    const results = configs.map((c, i) => ({
      name: ['test','lint','typecheck','coverage'][i],
      command: c.command, exitCode: 0, stdout: '', stderr: '',
      status: 'PASS' as const, rawOutput: i === 3 ? 'not valid json' : ''
    }))
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('FAIL')
    expect(v.blockingFailures.some(f => f.includes('PARSE_FAILED'))).toBe(true)
  })

  it('coverage below threshold → FAIL', () => {
    const configs = loadGateConfig(rawCfg())
    const results = configs.map((c, i) => ({
      name: ['test','lint','typecheck','coverage'][i],
      command: c.command, exitCode: 0, stdout: '', stderr: '',
      status: 'PASS' as const, rawOutput: i === 3 ? vitestOut(95) : ''
    }))
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('FAIL')
    expect(v.blockingFailures.some(f => f.includes('threshold not met'))).toBe(true)
  })

  it('coverage blocking but threshold missing → CONFIG_ERROR', () => {
    const cfg = rawCfg({ coverage: { threshold: undefined } as Partial<GateConfig> })
    const configs = loadGateConfig(cfg)
    const results = configs.map((c, i) => ({
      name: ['test','lint','typecheck','coverage'][i],
      command: c.command, exitCode: 0, stdout: '', stderr: '',
      status: 'PASS' as const, rawOutput: i === 3 ? vitestOut(100) : ''
    }))
    const v = evaluateGateResults(results, configs)
    expect(v.overall).toBe('FAIL')
    expect(v.blockingFailures.some(f => f.includes('CONFIG_ERROR'))).toBe(true)
  })
})
