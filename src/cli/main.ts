#!/usr/bin/env node
export {} // make this file a module for top-level await
const cmd = process.argv[2]

if (cmd === 'status') {
  const { runStatus } = await import('./status.js')
  runStatus(process.argv[3] || '.')
} else if (cmd === 'readiness') {
  const { runReadiness } = await import('./readiness.js')
  runReadiness('.')
} else if (cmd === 'validate') {
  const { runValidate } = await import('./validate.js')
  runValidate('.')
} else if (cmd === 'validate:plan') {
  const { runValidatePlan } = await import('./validate.js')
  runValidatePlan('.')
} else if (cmd === 'review:prompt') {
  const { runReviewPrompt } = await import('./review.js')
  runReviewPrompt('.')
} else if (cmd === 'review:render') {
  const { runReviewRender } = await import('./review.js')
  runReviewRender(process.argv[3] || '.', process.argv[4] || '.agent/codex-review-raw.jsonl')
} else {
  console.error(`Usage: 24h <readiness|validate|validate:plan|review:prompt|review:render|status>`)
  process.exit(1)
}
