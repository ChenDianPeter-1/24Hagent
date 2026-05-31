import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { buildReviewPrompt } from '../core/review/prompt-builder.js'
import { renderReviewMarkdown } from '../core/review/result-renderer.js'
import { parseCurrentTaskMarkdown } from '../core/schemas/task-package.js'
import { parseCodexJsonlToReviewResult } from '../core/schemas/review-result.js'

export function runReviewPrompt(root: string): void {
  const taskMd = readFileSync(resolve(root, '.agent/CURRENT_TASK.md'), 'utf-8')
  const workMd = existsSync(resolve(root, '.agent/WORK_REPORT.md'))
    ? readFileSync(resolve(root, '.agent/WORK_REPORT.md'), 'utf-8') : ''
  const rubric = existsSync(resolve(root, '.agent/CODEX_REVIEW_RUBRIC.md'))
    ? readFileSync(resolve(root, '.agent/CODEX_REVIEW_RUBRIC.md'), 'utf-8') : ''
  const diff = execSync('git diff HEAD', { cwd: root, encoding: 'utf-8', maxBuffer: 1024 * 1024 })

  const tp = parseCurrentTaskMarkdown(taskMd)
  const prompt = buildReviewPrompt({
    taskSpec: tp.specification,
    dodItems: tp.definition_of_done.map(d => d.content),
    workReport: workMd, gitDiff: diff, rubric
  })
  writeFileSync(resolve(root, '.agent/codex-review-prompt.md'), prompt, 'utf-8')
  console.log('Review prompt written to .agent/codex-review-prompt.md')
}

export function runReviewRender(root: string, jsonlPath: string): void {
  const jsonl = readFileSync(resolve(root, jsonlPath), 'utf-8')
  const result = parseCodexJsonlToReviewResult(jsonl)
  const md = renderReviewMarkdown({
    reviewResult: result, taskId: 'N/A',
    timestamp: new Date().toISOString(),
    rawOutputPath: jsonlPath
  })
  writeFileSync(resolve(root, '.agent/CODEX_REVIEW.md'), md, 'utf-8')
  console.log(md)
}
