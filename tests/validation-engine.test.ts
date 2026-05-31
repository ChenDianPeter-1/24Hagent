import { describe, it, expect } from 'vitest'
import { parseCoverageFromRawOutput, evaluateThresholds } from '../src/core/quality/validation-engine.js'

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
