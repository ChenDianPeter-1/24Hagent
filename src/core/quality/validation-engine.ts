import type { CoverageData, ThresholdResult } from './validation-types.js'

/** Parse vitest --reporter=json-summary stdout into CoverageData. */
export function parseCoverageFromRawOutput(rawOutput: string): CoverageData {
  if (!rawOutput.trim()) throw new Error('Coverage output is empty')

  // vitest stdout may contain ANSI codes and a text table before the JSON
  const jsonStart = rawOutput.indexOf('{"total":')
  const jsonStr = jsonStart >= 0 ? rawOutput.slice(jsonStart) : rawOutput

  let parsed: unknown
  try { parsed = JSON.parse(jsonStr) } catch {
    throw new Error('Failed to parse coverage JSON from output')
  }

  const total = (parsed as Record<string, unknown>)?.total as Record<string, unknown> | undefined
  if (!total) throw new Error('Coverage JSON missing "total" field')

  const pct = (key: string): number => {
    const v = (total[key] as Record<string, unknown>)?.pct
    if (typeof v !== 'number') throw new Error(`Coverage missing total.${key}.pct`)
    return v
  }

  return { lines: pct('lines'), branches: pct('branches'), functions: pct('functions'), statements: pct('statements') }
}

/** Compare coverage against thresholds. No rounding — actual must be >= required. */
export function evaluateThresholds(
  coverage: CoverageData,
  thresholds: { lines: number; branches: number; functions: number; statements: number }
): ThresholdResult {
  const metrics = [
    { name: 'lines',      actual: coverage.lines,      required: thresholds.lines },
    { name: 'branches',   actual: coverage.branches,   required: thresholds.branches },
    { name: 'functions',  actual: coverage.functions,  required: thresholds.functions },
    { name: 'statements', actual: coverage.statements, required: thresholds.statements }
  ].map(m => ({ ...m, pass: m.actual >= m.required }))

  return { metrics, overall: metrics.every(m => m.pass) }
}
