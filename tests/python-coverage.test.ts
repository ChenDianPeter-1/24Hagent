import { describe, it, expect } from 'vitest'
import { parseCoverageFromRawOutput, evaluateThresholds } from '../src/core/quality/validation-engine.js'

const coveragePyJson = (pct: number, branches?: { covered: number; total: number }) => {
  // Use exact values so covered_lines/num_statements*100 == pct exactly
  const total = 100
  const covered = pct // pct=90 → 90/100*100 = 90%
  const totals: Record<string, unknown> = {
    num_statements: total, covered_lines: covered,
    percent_covered: pct
  }
  if (branches) {
    totals.num_branches = branches.total
    totals.covered_branches = branches.covered
  }
  return JSON.stringify({ meta: { version: '7.4.0' }, totals })
}

describe('parseCoverageFromRawOutput — coverage.py', () => {
  it('parses coverage.py JSON', () => {
    const c = parseCoverageFromRawOutput(coveragePyJson(100))
    expect(c.lines).toBe(100)
    expect(c.statements).toBe(100)
    expect(c.functions).toBeNull() // coverage.py 不提供函数覆盖率
    expect(c.profile).toBe('coverage_py')
  })

  it('parses coverage.py with branches', () => {
    const c = parseCoverageFromRawOutput(coveragePyJson(90, { covered: 45, total: 50 }))
    expect(c.lines).toBe(90)
    expect(c.branches).toBe(90) // 45/50 * 100
    expect(c.functions).toBeNull()
  })

  it('branches is null when num_branches is 0', () => {
    const c = parseCoverageFromRawOutput(coveragePyJson(100, { covered: 0, total: 0 }))
    expect(c.branches).toBeNull()
  })

  it('still parses vitest JSON after change', () => {
    const vitest = JSON.stringify({ total: {
      lines: { total: 100, pct: 95 },
      branches: { total: 50, pct: 90 },
      functions: { total: 10, pct: 100 },
      statements: { total: 100, pct: 95 }
    }})
    const c = parseCoverageFromRawOutput(vitest)
    expect(c.lines).toBe(95)
    expect(c.branches).toBe(90)
    expect(c.functions).toBe(100)
    expect(c.profile).toBe('vitest')
  })
})

describe('evaluateThresholds with null metrics', () => {
  const t100 = { lines: 100, branches: null, functions: null, statements: 100 }
  const tStrict = { lines: 100, branches: 100, functions: 100, statements: 100 }

  it('null metrics are skipped (PASS)', () => {
    const cov = { lines: 100, branches: null, functions: null, statements: 100, profile: 'coverage_py' as const }
    const r = evaluateThresholds(cov, t100)
    expect(r.overall).toBe(true)
    expect(r.metrics.find(m => m.name === 'branches')!.pass).toBe(true)
    expect(r.metrics.find(m => m.name === 'functions')!.pass).toBe(true)
  })

  it('null actual with non-null required threshold → FAIL (config demands data tool cannot provide)', () => {
    const cov = { lines: 100, branches: null, functions: null, statements: 100, profile: 'coverage_py' as const }
    const r = evaluateThresholds(cov, tStrict)
    expect(r.overall).toBe(false) // coverage.py doesn't provide functions → FAIL when config demands it
    expect(r.metrics.find(m => m.name === 'functions')!.pass).toBe(false)
    expect(r.metrics.find(m => m.name === 'branches')!.pass).toBe(false)
  })

  it('lines below threshold fails even with null others', () => {
    const cov = { lines: 90, branches: null, functions: null, statements: 90, profile: 'coverage_py' as const }
    const r = evaluateThresholds(cov, t100)
    expect(r.overall).toBe(false)
    expect(r.metrics.find(m => m.name === 'lines')!.pass).toBe(false)
  })
})
