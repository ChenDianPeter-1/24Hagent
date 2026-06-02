import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  decideAegisNextAction,
  getAegisRuntimePaths,
  parseAegisRunStateJson,
  renderProjectProgress,
  renderStatus,
  renderWorkInstruction
} from '../core/aegis-runtime/index.js'

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function firstNonEmptyLine(text: string): string | undefined {
  return text.split('\n').map((line) => line.trim()).find(Boolean)
}

export function runAegis(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const currentTaskMd = existsSync(paths.currentTask) ? readFileSync(paths.currentTask, 'utf-8') : ''
  const projectBlueprintMd = existsSync(paths.projectBlueprint) ? readFileSync(paths.projectBlueprint, 'utf-8') : ''
  const currentTaskTitle = firstNonEmptyLine(section(currentTaskMd, 'Title'))
  const projectGoal = firstNonEmptyLine(section(projectBlueprintMd, 'Product Goal'))
  const decision = decideAegisNextAction(state, {
    hasCurrentTask: existsSync(paths.currentTask),
    hasTaskQualityReport: existsSync(paths.taskQualityReport),
    hasQualityReadinessReport: existsSync(paths.qualityReadinessReport),
    hasValidationReport: existsSync(paths.validationReport),
    hasSuperpowerSources: existsSync(paths.superpowerSources),
    hasDisciplineReport: existsSync(paths.disciplineReport),
    hasCodexReviewPrompt: existsSync(paths.codexReviewPrompt),
    hasCodexReviewRaw: existsSync(paths.codexReviewRaw),
    hasCodexReview: existsSync(paths.codexReview)
  })

  const input = {
    state,
    projectGoal,
    currentTaskTitle,
    nextAction: decision.nextAction,
    risks: decision.risks
  }

  mkdirSync(paths.currentDir, { recursive: true })
  mkdirSync(paths.blueprintDir, { recursive: true })
  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')

  console.log(renderStatus(input))
}
