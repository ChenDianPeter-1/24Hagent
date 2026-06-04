import { resolve } from 'node:path'

export const LEGACY_AGENT_DIR = '.agent'

export type AegisRuntimeKind = 'aegis' | 'legacy-agent'

export type LegacyAgentRuntimePaths = {
  currentTask: string
  workReport: string
  superpowerSummary: string
  disciplineReport: string
  validationReport: string
  qualityGates: string
  qualityReadinessReport: string
  taskQualityReport: string
  codexRubric: string
  codexReviewPrompt: string
  codexReviewRaw: string
  codexReview: string
  runState: string
}

/** Compatibility-only paths for projects created before Aegis adopted .aegis/. */
export function getLegacyAgentRuntimePaths(root: string): LegacyAgentRuntimePaths {
  const legacyDir = resolve(root, LEGACY_AGENT_DIR)
  return {
    currentTask: resolve(legacyDir, 'CURRENT_TASK.md'),
    workReport: resolve(legacyDir, 'WORK_REPORT.md'),
    superpowerSummary: resolve(legacyDir, 'SUPERPOWER_SUMMARY.md'),
    disciplineReport: resolve(legacyDir, 'DISCIPLINE_REPORT.md'),
    validationReport: resolve(legacyDir, 'VALIDATION_REPORT.md'),
    qualityGates: resolve(legacyDir, 'QUALITY_GATES.json'),
    qualityReadinessReport: resolve(legacyDir, 'QUALITY_READINESS_REPORT.md'),
    taskQualityReport: resolve(legacyDir, 'TASK_QUALITY_REPORT.md'),
    codexRubric: resolve(legacyDir, 'CODEX_REVIEW_RUBRIC.md'),
    codexReviewPrompt: resolve(legacyDir, 'codex-review-prompt.md'),
    codexReviewRaw: resolve(legacyDir, 'codex-review-raw.jsonl'),
    codexReview: resolve(legacyDir, 'CODEX_REVIEW.md'),
    runState: resolve(legacyDir, 'RUN_STATE.json')
  }
}
