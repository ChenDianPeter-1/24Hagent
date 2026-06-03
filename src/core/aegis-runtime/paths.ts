import { resolve } from 'node:path'

export const AEGIS_DIR = '.aegis'

export type AegisRuntimePaths = {
  root: string
  runtimeDir: string
  configDir: string
  blueprintDir: string
  currentDir: string
  stateDir: string
  archiveDir: string
  aegisConfig: string
  qualityGates: string
  codexRubric: string
  claudeCodeContract: string
  projectBlueprint: string
  projectProgress: string
  currentTask: string
  status: string
  workInstruction: string
  decisionRequest: string
  humanHandoff: string
  roundSummary: string
  superpowerSources: string
  superpowerSummary: string
  disciplineReport: string
  planningEvidence: string
  tddEvidence: string
  debuggingEvidence: string
  verificationEvidence: string
  reviewEvidence: string
  taskQualityReport: string
  qualityReadinessReport: string
  validationReport: string
  codexReviewPrompt: string
  codexReviewRaw: string
  codexReview: string
  runState: string
}

export function getAegisRuntimePaths(root: string): AegisRuntimePaths {
  const runtimeDir = resolve(root, AEGIS_DIR)
  const configDir = resolve(runtimeDir, 'config')
  const blueprintDir = resolve(runtimeDir, 'blueprint')
  const currentDir = resolve(runtimeDir, 'current')
  const stateDir = resolve(runtimeDir, 'state')
  const archiveDir = resolve(runtimeDir, 'archive')

  return {
    root,
    runtimeDir,
    configDir,
    blueprintDir,
    currentDir,
    stateDir,
    archiveDir,
    aegisConfig: resolve(configDir, 'aegis.json'),
    qualityGates: resolve(configDir, 'quality-gates.json'),
    codexRubric: resolve(configDir, 'codex-rubric.md'),
    claudeCodeContract: resolve(configDir, 'claude-code-contract.md'),
    projectBlueprint: resolve(blueprintDir, 'project-blueprint.md'),
    projectProgress: resolve(blueprintDir, 'project-progress.md'),
    currentTask: resolve(currentDir, 'current-task.md'),
    status: resolve(currentDir, 'status.md'),
    workInstruction: resolve(currentDir, 'work-instruction.md'),
    decisionRequest: resolve(currentDir, 'decision-request.md'),
    humanHandoff: resolve(currentDir, 'human-handoff.md'),
    roundSummary: resolve(currentDir, 'round-summary.md'),
    superpowerSources: resolve(currentDir, 'superpower-sources.json'),
    superpowerSummary: resolve(currentDir, 'superpower-summary.md'),
    disciplineReport: resolve(currentDir, 'discipline-report.md'),
    planningEvidence: resolve(currentDir, 'planning-evidence.md'),
    tddEvidence: resolve(currentDir, 'tdd-evidence.md'),
    debuggingEvidence: resolve(currentDir, 'debugging-evidence.md'),
    verificationEvidence: resolve(currentDir, 'verification-evidence.md'),
    reviewEvidence: resolve(currentDir, 'review-evidence.md'),
    taskQualityReport: resolve(currentDir, 'task-quality-report.md'),
    qualityReadinessReport: resolve(currentDir, 'quality-readiness-report.md'),
    validationReport: resolve(currentDir, 'validation-report.md'),
    codexReviewPrompt: resolve(currentDir, 'codex-review-prompt.md'),
    codexReviewRaw: resolve(currentDir, 'codex-review.jsonl'),
    codexReview: resolve(currentDir, 'codex-review.md'),
    runState: resolve(stateDir, 'run-state.json')
  }
}
