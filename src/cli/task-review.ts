import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderTaskQualityReview, reviewCurrentTaskMarkdown } from '../core/quality/task-quality-gate.js'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'

export type TaskReviewRuntimePaths = {
  currentTaskPath: string
  reportPath: string
  runtimeKind: 'aegis' | 'legacy-agent'
}

export function getTaskReviewRuntimePaths(root: string): TaskReviewRuntimePaths {
  const aegis = getAegisRuntimePaths(root)
  if (existsSync(aegis.currentTask)) {
    return {
      currentTaskPath: aegis.currentTask,
      reportPath: aegis.taskQualityReport,
      runtimeKind: 'aegis'
    }
  }

  return {
    currentTaskPath: resolve(root, '.agent/CURRENT_TASK.md'),
    reportPath: resolve(root, '.agent/TASK_QUALITY_REPORT.md'),
    runtimeKind: 'legacy-agent'
  }
}

export function runTaskReview(root: string): void {
  const paths = getTaskReviewRuntimePaths(root)
  const rawTask = readFileSync(paths.currentTaskPath, 'utf-8')
  const review = reviewCurrentTaskMarkdown(rawTask)
  const report = renderTaskQualityReview(review)
  mkdirSync(resolve(paths.reportPath, '..'), { recursive: true })
  writeFileSync(paths.reportPath, report, 'utf-8')
  console.log(report)
  process.exitCode = review.verdict === 'PASS' ? 0 : 1
}
