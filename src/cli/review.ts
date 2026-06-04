import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildReviewPrompt } from '../core/review/prompt-builder.js'
import { buildReviewEvidence } from '../core/review/evidence-builder.js'
import { renderReviewMarkdown } from '../core/review/result-renderer.js'
import { parseCodexJsonlToReviewResult } from '../core/schemas/review-result.js'
import { getAegisRuntimePaths, routeCodexReviewResult } from '../core/aegis-runtime/index.js'

export type ReviewRuntimePaths = {
  promptPath: string
  rawReviewPath: string
  renderedReviewPath: string
  runtimeKind: 'aegis'
}

export function getReviewRuntimePaths(root: string): ReviewRuntimePaths {
  const aegis = getAegisRuntimePaths(root)
  return {
    promptPath: aegis.codexReviewPrompt,
    rawReviewPath: aegis.codexReviewRaw,
    renderedReviewPath: aegis.codexReview,
    runtimeKind: 'aegis'
  }
}

export function runReviewPrompt(root: string): void {
  const paths = getReviewRuntimePaths(root)
  const prompt = buildReviewPrompt(buildReviewEvidence(root))
  mkdirSync(resolve(paths.promptPath, '..'), { recursive: true })
  writeFileSync(paths.promptPath, prompt, 'utf-8')
  console.log(`Review prompt written to ${paths.promptPath}`)
}

export function runReviewRender(root: string, jsonlPath?: string): void {
  const paths = getReviewRuntimePaths(root)
  const rawOutputPath = jsonlPath ? resolve(root, jsonlPath) : paths.rawReviewPath
  const jsonl = readFileSync(rawOutputPath, 'utf-8')
  const result = parseCodexJsonlToReviewResult(jsonl)
  const timestamp = new Date().toISOString()
  const md = renderReviewMarkdown({
    reviewResult: result, taskId: 'N/A',
    timestamp,
    rawOutputPath
  })
  mkdirSync(resolve(paths.renderedReviewPath, '..'), { recursive: true })
  writeFileSync(paths.renderedReviewPath, md, 'utf-8')
  routeCodexReviewResult(root, result, timestamp)
  console.log(md)
}
