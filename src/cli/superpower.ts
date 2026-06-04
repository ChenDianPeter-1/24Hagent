import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'
import {
  buildSuperpowerSourceManifest,
  checkSuperpowerDiscipline,
  collectRoundDisciplineEvidence,
  renderDisciplineReport,
  renderSuperpowerSummary,
  type SuperpowerSourceManifest
} from '../core/superpower/sources.js'

type AegisConfig = {
  superpower?: {
    local_path_hint?: string
  }
}

function readAegisConfig(root: string): AegisConfig {
  const paths = getAegisRuntimePaths(root)
  return JSON.parse(readFileSync(paths.aegisConfig, 'utf-8')) as AegisConfig
}

export function runSuperpowerScan(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const configuredPath = readAegisConfig(root).superpower?.local_path_hint
  const sourceRoot = configuredPath || resolve(root, '.superpowers')
  const manifest = buildSuperpowerSourceManifest(sourceRoot, new Date().toISOString())

  mkdirSync(paths.currentDir, { recursive: true })
  writeFileSync(paths.superpowerSources, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
  writeFileSync(paths.superpowerSummary, renderSuperpowerSummary(manifest), 'utf-8')

  console.log(`Superpower sources: ${manifest.sources.length}`)
  console.log(`Manifest: ${paths.superpowerSources}`)
}

export function runDisciplineCheck(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const manifest = JSON.parse(readFileSync(paths.superpowerSources, 'utf-8')) as SuperpowerSourceManifest
  const currentTaskMarkdown = readFileSync(paths.currentTask, 'utf-8')
  const evidence = collectRoundDisciplineEvidence(paths.currentDir, currentTaskMarkdown)
  const result = checkSuperpowerDiscipline(manifest, evidence)
  const report = renderDisciplineReport(result, manifest)

  mkdirSync(paths.currentDir, { recursive: true })
  writeFileSync(paths.disciplineReport, report, 'utf-8')

  console.log(report)
  process.exitCode = result.verdict === 'PASS' ? 0 : 1
}
