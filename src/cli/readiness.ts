import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { detectToolchain, detectPythonToolchain, compareGates, classifyReadiness, renderReadinessReport, computeReadinessExitCode } from '../core/quality/readiness-engine.js'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'

/** Strip UTF-8 BOM before JSON.parse (PowerShell often writes BOM) */
function readJsonSafe(path: string) {
  let raw = readFileSync(path, 'utf-8')
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
  return JSON.parse(raw)
}

function detectPackageManager(root: string): string {
  const locks = ['uv.lock', 'poetry.lock', 'pdm.lock', 'Pipfile']
  const pms = ['uv', 'poetry', 'pdm', 'pipenv']
  for (let i = 0; i < locks.length; i++) {
    if (existsSync(resolve(root, locks[i]))) return pms[i]
  }
  return 'pip'
}

export type ReadinessRuntimePaths = {
  qualityGatesPath: string
  reportPath: string
  runtimeKind: 'aegis' | 'legacy-agent'
}

export function getReadinessRuntimePaths(root: string): ReadinessRuntimePaths {
  const aegis = getAegisRuntimePaths(root)
  if (existsSync(aegis.qualityGates)) {
    return {
      qualityGatesPath: aegis.qualityGates,
      reportPath: aegis.qualityReadinessReport,
      runtimeKind: 'aegis'
    }
  }

  return {
    qualityGatesPath: resolve(root, '.agent/QUALITY_GATES.json'),
    reportPath: resolve(root, '.agent/QUALITY_READINESS_REPORT.md'),
    runtimeKind: 'legacy-agent'
  }
}

export function runReadiness(root: string): void {
  const pkgPath = resolve(root, 'package.json')
  const pyprojectPath = resolve(root, 'pyproject.toml')
  const paths = getReadinessRuntimePaths(root)

  let tc
  if (existsSync(pkgPath)) {
    const pkg = readJsonSafe(pkgPath)
    tc = detectToolchain(pkg)
  } else if (existsSync(pyprojectPath)) {
    const tomlText = readFileSync(pyprojectPath, 'utf-8')
    tc = detectPythonToolchain(tomlText, detectPackageManager(root))
  } else {
    console.error('readiness: no project file found (package.json or pyproject.toml required)')
    process.exit(1)
  }

  const gatesRaw = existsSync(paths.qualityGatesPath) ? readJsonSafe(paths.qualityGatesPath) : null
  const audit = gatesRaw ? compareGates(tc, gatesRaw.gates) : []
  const result = classifyReadiness(audit, tc)
  const report = renderReadinessReport(result)

  mkdirSync(resolve(paths.reportPath, '..'), { recursive: true })
  writeFileSync(paths.reportPath, report, 'utf-8')
  console.log(`Verdict: **${result.verdict}**`)
  process.exitCode = computeReadinessExitCode(result.verdict)
}
