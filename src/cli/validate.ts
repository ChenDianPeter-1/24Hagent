import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadGateConfig, planGateExecutions, runConfiguredGates, evaluateGateResults, renderValidationReport } from '../core/quality/validation-engine.js'
import { RealCommandRunner } from '../adapters/shell/command-runner.js'

function readJsonSafe(path: string) {
  let raw = readFileSync(path, 'utf-8')
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
  return JSON.parse(raw)
}

export async function runValidate(root: string): Promise<void> {
  const gatesRaw = readJsonSafe(resolve(root, '.agent/QUALITY_GATES.json'))
  const configs = loadGateConfig(gatesRaw)
  const plans = planGateExecutions(configs)
  const results = await runConfiguredGates(plans, new RealCommandRunner())
  const verdict = evaluateGateResults(results, configs)
  const report = renderValidationReport({
    verdict, taskId: 'N/A', timestamp: new Date().toISOString(), readinessVerdict: 'READY'
  })
  writeFileSync(resolve(root, '.agent/VALIDATION_REPORT.md'), report, 'utf-8')
  console.log(`Overall: ${verdict.overall}`)
  process.exitCode = verdict.overall === 'PASS' ? 0 : 1
}

export function runValidatePlan(root: string): void {
  const gatesRaw = readJsonSafe(resolve(root, '.agent/QUALITY_GATES.json'))
  const configs = loadGateConfig(gatesRaw)
  const plans = planGateExecutions(configs)
  for (const p of plans) {
    const status = p.disabled ? 'SKIPPED' : 'PENDING'
    console.log(`${p.name} (${p.blocking ? 'blocking' : 'non-blocking'}): ${status} -- ${p.command}`)
  }
}
