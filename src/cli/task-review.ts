import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderTaskQualityReview, reviewCurrentTaskMarkdown } from '../core/quality/task-quality-gate.js'

export function runTaskReview(root: string): void {
  const rawTask = readFileSync(resolve(root, '.agent/CURRENT_TASK.md'), 'utf-8')
  const review = reviewCurrentTaskMarkdown(rawTask)
  const report = renderTaskQualityReview(review)
  writeFileSync(resolve(root, '.agent/TASK_QUALITY_REPORT.md'), report, 'utf-8')
  console.log(report)
  process.exitCode = review.verdict === 'PASS' ? 0 : 1
}
