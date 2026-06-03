import { RealCommandRunner } from '../adapters/shell/command-runner.js'
import { runRoundGate } from '../core/aegis-runtime/index.js'

export async function runRoundCheck(root: string): Promise<void> {
  const result = await runRoundGate(root, new RealCommandRunner())
  console.log(`Round gate: ${result.verdict}`)
  console.log(`Report: ${result.reportPath}`)
  if (result.promptPath) console.log(`Codex prompt: ${result.promptPath}`)
  process.exitCode = result.verdict === 'PASS' ? 0 : 1
}
