import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectToolchain, detectPythonToolchain, compareGates, classifyReadiness, renderReadinessReport, computeReadinessExitCode } from '../core/quality/readiness-engine.js'

function detectPackageManager(root: string): string {
  const locks = ['uv.lock', 'poetry.lock', 'pdm.lock', 'Pipfile']
  const pms = ['uv', 'poetry', 'pdm', 'pipenv']
  for (let i = 0; i < locks.length; i++) {
    if (existsSync(resolve(root, locks[i]))) return pms[i]
  }
  return 'pip'
}

export function runReadiness(root: string): void {
  const pkgPath = resolve(root, 'package.json')
  const pyprojectPath = resolve(root, 'pyproject.toml')
  const gatesPath = resolve(root, '.agent/QUALITY_GATES.json')

  let tc
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    tc = detectToolchain(pkg)
  } else if (existsSync(pyprojectPath)) {
    const tomlText = readFileSync(pyprojectPath, 'utf-8')
    tc = detectPythonToolchain(tomlText, detectPackageManager(root))
  } else {
    console.error('readiness: no project file found (package.json or pyproject.toml required)')
    process.exit(1)
  }

  const gatesRaw = existsSync(gatesPath) ? JSON.parse(readFileSync(gatesPath, 'utf-8')) : null
  const audit = gatesRaw ? compareGates(tc, gatesRaw.gates) : []
  const result = classifyReadiness(audit, tc)
  const report = renderReadinessReport(result)

  writeFileSync(resolve(root, '.agent/QUALITY_READINESS_REPORT.md'), report, 'utf-8')
  console.log(`Verdict: **${result.verdict}**`)
  process.exitCode = computeReadinessExitCode(result.verdict)
}
