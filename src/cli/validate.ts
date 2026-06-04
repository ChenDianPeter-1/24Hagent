import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadGateConfig, planGateExecutions, runConfiguredGates, evaluateGateResults, renderValidationReport } from '../core/quality/validation-engine.js'
import { RealCommandRunner } from '../adapters/shell/command-runner.js'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'

function readJsonSafe(path: string) {
  let raw = readFileSync(path, 'utf-8')
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
  return JSON.parse(raw)
}

export type ValidationRuntimePaths = {
  qualityGatesPath: string
  reportPath: string
  runtimeKind: 'aegis'
}

export function getValidationRuntimePaths(root: string): ValidationRuntimePaths {
  const aegis = getAegisRuntimePaths(root)
  return {
    qualityGatesPath: aegis.qualityGates,
    reportPath: aegis.validationReport,
    runtimeKind: 'aegis'
  }
}

export async function runValidate(root: string): Promise<void> {
  const paths = getValidationRuntimePaths(root)
  const gatesRaw = readJsonSafe(paths.qualityGatesPath)
  const configs = loadGateConfig(gatesRaw)
  const plans = planGateExecutions(configs)
  const results = await runConfiguredGates(plans, new RealCommandRunner())
  const verdict = evaluateGateResults(results, configs)
  const report = renderValidationReport({
    verdict, taskId: 'N/A', timestamp: new Date().toISOString(), readinessVerdict: 'READY'
  })
  mkdirSync(resolve(paths.reportPath, '..'), { recursive: true })
  writeFileSync(paths.reportPath, report, 'utf-8')
  console.log(`Overall: ${verdict.overall}`)
  console.log(`Validation report: ${paths.reportPath}`)
  process.exitCode = verdict.overall === 'PASS' ? 0 : 1
}

export function runValidatePlan(root: string): void {
  const paths = getValidationRuntimePaths(root)
  const gatesRaw = readJsonSafe(paths.qualityGatesPath)
  const configs = loadGateConfig(gatesRaw)
  const plans = planGateExecutions(configs)
  console.log(`Quality gates: ${paths.qualityGatesPath}`)
  for (const p of plans) {
    const status = p.disabled ? 'SKIPPED' : 'PENDING'
    console.log(`${p.name} (${p.blocking ? 'blocking' : 'non-blocking'}): ${status} -- ${p.command}`)
  }
}
