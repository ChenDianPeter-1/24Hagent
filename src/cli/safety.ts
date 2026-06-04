import { runSafetyCheck, writeCommitSuggestion } from '../core/aegis-runtime/index.js'

export function runSafetyCheckCli(root: string): void {
  const result = runSafetyCheck(root)
  console.log(`Safety: ${result.verdict}`)
  console.log(`Report: ${result.reportPath}`)
  process.exitCode = result.verdict === 'PASS' ? 0 : 1
}

export function runCommitSuggestion(root: string): void {
  const path = writeCommitSuggestion(root)
  console.log(`Commit suggestion: ${path}`)
}
