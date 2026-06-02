import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getAegisRuntimePaths,
  parseAegisRunStateJson,
  renderProjectProgress,
  renderStatus,
  renderWorkInstruction,
  type AegisRunState
} from '../core/aegis-runtime/index.js'
import { parseRunStateJson, type RunState } from '../core/schemas/run-state.js'
import { parseCurrentTaskMarkdown, type TaskPackage } from '../core/schemas/task-package.js'

/** Pure: strictly 3 lines. No fs, no process, no console. */
export function formatStatus(rs: RunState, tp: TaskPackage): string {
  return [
    `当前阶段: ${rs.phase}`,
    `当前任务: ${tp.task_id} - ${tp.title}`,
    `上次审查: ${rs.last_verdict ?? '无'}`
  ].join('\n')
}

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function firstNonEmptyLine(text: string): string | undefined {
  return text.split('\n').map((line) => line.trim()).find(Boolean)
}

export function formatAegisStatus(state: AegisRunState, currentTaskMd = '', projectBlueprintMd = ''): string {
  const currentTaskTitle = firstNonEmptyLine(section(currentTaskMd, 'Title'))
  const projectGoal = firstNonEmptyLine(section(projectBlueprintMd, 'Product Goal'))
  return renderStatus({
    state,
    projectGoal,
    currentTaskTitle,
    nextAction: state.phase === 'waiting-for-construction'
      ? 'Claude Code should read `.aegis/current/work-instruction.md` and perform the scoped work.'
      : 'Run `aegis` to continue or refresh the current state.'
  })
}

export function runAegisStatus(root: string): void {
  const paths = getAegisRuntimePaths(root)
  const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const currentTaskMd = existsSync(paths.currentTask) ? readFileSync(paths.currentTask, 'utf-8') : ''
  const projectBlueprintMd = existsSync(paths.projectBlueprint) ? readFileSync(paths.projectBlueprint, 'utf-8') : ''
  const currentTaskTitle = firstNonEmptyLine(section(currentTaskMd, 'Title'))
  const projectGoal = firstNonEmptyLine(section(projectBlueprintMd, 'Product Goal'))
  const nextAction = state.phase === 'waiting-for-construction'
    ? 'Claude Code should read `.aegis/current/work-instruction.md` and perform the scoped work.'
    : 'Run `aegis` to continue or refresh the current state.'

  const input = { state, projectGoal, currentTaskTitle, nextAction }

  mkdirSync(paths.currentDir, { recursive: true })
  mkdirSync(paths.blueprintDir, { recursive: true })
  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')

  console.log(renderStatus(input))
}

export function runLegacyStatus(root: string): void {
  const rs = parseRunStateJson(readFileSync(resolve(root, '.agent/RUN_STATE.json'), 'utf-8'))
  const tp = parseCurrentTaskMarkdown(readFileSync(resolve(root, '.agent/CURRENT_TASK.md'), 'utf-8'))
  console.log(formatStatus(rs, tp))
}

/** Read Aegis runtime status when present, otherwise fall back to legacy .agent status. */
export function runStatus(root: string): void {
  if (existsSync(resolve(root, '.aegis/state/run-state.json'))) {
    runAegisStatus(root)
    return
  }

  runLegacyStatus(root)
}
