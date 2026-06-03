#!/usr/bin/env node
export {} // make this file a module for top-level await
const cmd = process.argv[2]

if (!cmd) {
  const { runAegis } = await import('./aegis.js')
  runAegis('.')
} else if (cmd === 'status') {
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
} else if (cmd === 'task:review') {
  const { runTaskReview } = await import('./task-review.js')
  runTaskReview('.')
} else if (cmd === 'contract') {
  const { runContract } = await import('./contract.js')
  runContract('.')
} else if (cmd === 'superpower:scan') {
  const { runSuperpowerScan } = await import('./superpower.js')
  runSuperpowerScan('.')
} else if (cmd === 'discipline:check') {
  const { runDisciplineCheck } = await import('./superpower.js')
  runDisciplineCheck('.')
} else if (cmd === 'review:prompt') {
  const { runReviewPrompt } = await import('./review.js')
  runReviewPrompt('.')
} else if (cmd === 'review:render') {
  const { runReviewRender } = await import('./review.js')
  const inputIdx = process.argv.indexOf('--input')
  const jsonlPath = inputIdx >= 0 ? process.argv[inputIdx + 1] : undefined
  runReviewRender('.', jsonlPath)
} else {
  console.error(`Usage: aegis <readiness|validate|validate:plan|task:review|contract|superpower:scan|discipline:check|review:prompt|review:render|status>`)
  console.error(`Compatibility alias: 24h <command>`)
  process.exit(1)
}
