import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

/** Read .agent/ files and print status. Exits 1 on failure. */
export function runStatus(root: string): void {
  const rs = parseRunStateJson(readFileSync(resolve(root, '.agent/RUN_STATE.json'), 'utf-8'))
  const tp = parseCurrentTaskMarkdown(readFileSync(resolve(root, '.agent/CURRENT_TASK.md'), 'utf-8'))
  console.log(formatStatus(rs, tp))
}
