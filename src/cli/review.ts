import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildReviewPrompt } from '../core/review/prompt-builder.js'
import { buildReviewEvidence } from '../core/review/evidence-builder.js'
import { renderReviewMarkdown } from '../core/review/result-renderer.js'
import { parseCodexJsonlToReviewResult } from '../core/schemas/review-result.js'

export function runReviewPrompt(root: string): void {
  const prompt = buildReviewPrompt(buildReviewEvidence(root))
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
