import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderTaskQualityReview, reviewCurrentTaskMarkdown } from '../core/quality/task-quality-gate.js'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'

export type TaskReviewRuntimePaths = {
  currentTaskPath: string
  reportPath: string
  runtimeKind: 'aegis'
}

export function getTaskReviewRuntimePaths(root: string): TaskReviewRuntimePaths {
  const aegis = getAegisRuntimePaths(root)
  return {
    currentTaskPath: aegis.currentTask,
    reportPath: aegis.taskQualityReport,
    runtimeKind: 'aegis'
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
