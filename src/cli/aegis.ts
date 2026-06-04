import { existsSync, readFileSync } from 'node:fs'
import {
  applyProgressionPolicy,
  decideAegisNextAction,
  getAegisRuntimePaths,
  parseAegisRunStateJson,
  readNavigationContext,
  refreshNavigation,
  renderStatus,
  writeProgressionSideEffects
} from '../core/aegis-runtime/index.js'

function reportHasPassVerdict(path: string): boolean {
  if (!existsSync(path)) return false
  return /^Verdict:\s*PASS\s*$/m.test(readFileSync(path, 'utf-8'))
}

export function runAegis(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const initialState = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const continuation = applyProgressionPolicy(root, initialState, new Date().toISOString())
  const state = continuation.state
  if (state !== initialState) {
    writeProgressionSideEffects(root, continuation)
  }
  const { currentTaskTitle, projectGoal } = readNavigationContext(paths)
  const decision = decideAegisNextAction(state, {
    hasCurrentTask: existsSync(paths.currentTask),
    hasTaskQualityReport: existsSync(paths.taskQualityReport),
    hasQualityReadinessReport: existsSync(paths.qualityReadinessReport),
    hasValidationReport: existsSync(paths.validationReport),
    hasSuperpowerSources: existsSync(paths.superpowerSources),
    hasDisciplineReport: existsSync(paths.disciplineReport),
    hasPassingDisciplineReport: reportHasPassVerdict(paths.disciplineReport),
    hasCodexReviewPrompt: existsSync(paths.codexReviewPrompt),
    hasCodexReviewRaw: existsSync(paths.codexReviewRaw),
    hasCodexReview: existsSync(paths.codexReview)
  })

  const input = {
    state,
    projectGoal,
    currentTaskTitle,
    nextAction: decision.nextAction,
    modeDecision: continuation.modeDecision,
    risks: decision.risks
  }

  refreshNavigation(paths, input, {
    preserveWorkInstruction: continuation.preserveWorkInstruction,
    decisionRequest: continuation.decisionRequest
  })

  console.log(renderStatus(input))
}
