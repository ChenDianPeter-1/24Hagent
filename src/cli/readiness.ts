import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectToolchain, compareGates, classifyReadiness, renderReadinessReport, computeReadinessExitCode } from '../core/quality/readiness-engine.js'

export function runReadiness(root: string): void {
  const pkgPath = resolve(root, 'package.json')
  const gatesPath = resolve(root, '.agent/QUALITY_GATES.json')

  if (!existsSync(pkgPath)) {
    console.error('readiness: package.json not found')
    process.exit(1)
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const gatesRaw = existsSync(gatesPath) ? JSON.parse(readFileSync(gatesPath, 'utf-8')) : null

  const tc = detectToolchain(pkg)
  const audit = gatesRaw ? compareGates(tc, gatesRaw.gates) : []
  const result = classifyReadiness(audit, tc)
  const report = renderReadinessReport(result)

  writeFileSync(resolve(root, '.agent/QUALITY_READINESS_REPORT.md'), report, 'utf-8')
  console.log(`Verdict: **${result.verdict}**`)
  process.exitCode = computeReadinessExitCode(result.verdict)
}
