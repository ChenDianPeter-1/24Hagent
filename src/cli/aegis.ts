import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  decideAegisNextAction,
  getAegisRuntimePaths,
  parseAegisRunStateJson,
  renderProjectProgress,
  renderStatus,
  renderWorkInstruction,
  stringifyAegisRunState,
  type AegisRunState
} from '../core/aegis-runtime/index.js'

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function firstNonEmptyLine(text: string): string | undefined {
  return text.split('\n').map((line) => line.trim()).find(Boolean)
}

function reportHasPassVerdict(path: string): boolean {
  if (!existsSync(path)) return false
  return /^Verdict:\s*PASS\s*$/m.test(readFileSync(path, 'utf-8'))
}

function continuePostVerdictState(state: AegisRunState, timestamp: string): {
  state: AegisRunState
  preserveWorkInstruction: boolean
} {
  if (state.phase === 'need-fix') {
    return {
      state: {
        ...state,
        phase: 'waiting-for-construction',
        updated_at: timestamp
      },
      preserveWorkInstruction: true
    }
  }

  if (state.phase === 'passed') {
    return {
      state: {
        ...state,
        task_id: null,
        phase: 'ready-for-task',
        updated_at: timestamp
      },
      preserveWorkInstruction: false
    }
  }

  return { state, preserveWorkInstruction: false }
}

export function runAegis(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const initialState = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const continuation = continuePostVerdictState(initialState, new Date().toISOString())
  const state = continuation.state
  if (state !== initialState) {
    writeFileSync(paths.runState, stringifyAegisRunState(state), 'utf-8')
  }
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
    risks: decision.risks
  }

  mkdirSync(paths.currentDir, { recursive: true })
  mkdirSync(paths.blueprintDir, { recursive: true })
  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  if (!continuation.preserveWorkInstruction) {
    writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  }
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')

  console.log(renderStatus(input))
}
