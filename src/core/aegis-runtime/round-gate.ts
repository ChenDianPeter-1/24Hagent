import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { CommandRunner } from '../../adapters/shell/command-runner.js'
import { loadGateConfig, planGateExecutions, runConfiguredGates, evaluateGateResults, renderValidationReport } from '../quality/validation-engine.js'
import { renderTaskQualityReview, reviewCurrentTaskMarkdown } from '../quality/task-quality-gate.js'
import { buildReviewEvidence } from '../review/evidence-builder.js'
import { buildReviewPrompt } from '../review/prompt-builder.js'
import type { SuperpowerSourceManifest } from '../superpower/sources.js'
import { checkSuperpowerDiscipline, collectRoundDisciplineEvidence, renderDisciplineReport } from '../superpower/sources.js'
import { getAegisRuntimePaths } from './paths.js'
import { runSafetyCheck } from './safety.js'

export type RoundGateStepName =
  | 'safety'
  | 'task-quality'
  | 'superpower-discipline'
  | 'local-validation'
  | 'codex-prompt-readiness'

export type RoundGateStep = {
  name: RoundGateStepName
  verdict: 'PASS' | 'FAIL'
  detail: string
}

export type RoundGateResult = {
  verdict: 'PASS' | 'NEED_FIX'
  steps: RoundGateStep[]
  promptPath: string | null
  reportPath: string
}

function readJsonSafe(path: string): unknown {
  let raw = readFileSync(path, 'utf-8')
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
  return JSON.parse(raw) as unknown
}

function renderRoundGateReport(result: RoundGateResult, timestamp: string): string {
  const stepRows = result.steps.map(step =>
    `| ${step.name} | ${step.verdict} | ${step.detail.replace(/\r?\n/g, ' ')} |`
  )

  return [
    '# Quality Readiness Report',
    '',
    `Generated: ${timestamp}`,
    '',
    `Verdict: ${result.verdict}`,
    '',
    '## Gate Order',
    '',
    '| Step | Verdict | Detail |',
    '|------|---------|--------|',
    ...stepRows,
    '',
    '## Codex Boundary',
    '',
    result.promptPath
      ? `Codex prompt is ready at \`${result.promptPath}\`. Aegis must not execute Codex itself; Claude Code or the human runs the external read-only Codex review command.`
      : 'Codex prompt was not generated because prerequisite gates did not all pass.',
    '',
    'Aegis packages evidence and routes parsed Codex verdicts. Codex remains the final semantic reviewer.',
    ''
  ].join('\n')
}

function appendStep(steps: RoundGateStep[], step: RoundGateStep): RoundGateResult | null {
  steps.push(step)
  if (step.verdict === 'FAIL') {
    return {
      verdict: 'NEED_FIX',
      steps,
      promptPath: null,
      reportPath: ''
    }
  }
  return null
}

export async function runRoundGate(root: string, runner: CommandRunner, timestamp = new Date().toISOString()): Promise<RoundGateResult> {
  const paths = getAegisRuntimePaths(root)
  const steps: RoundGateStep[] = []
  mkdirSync(paths.currentDir, { recursive: true })

  const taskMarkdown = readFileSync(paths.currentTask, 'utf-8')
  const safety = runSafetyCheck(root, timestamp)
  let stopped = appendStep(steps, {
    name: 'safety',
    verdict: safety.verdict === 'PASS' ? 'PASS' : 'FAIL',
    detail: safety.verdict === 'PASS' ? 'No hard safety boundaries detected.' : 'Safety check hard-blocked the round.'
  })

  const taskReview = reviewCurrentTaskMarkdown(taskMarkdown)
  writeFileSync(paths.taskQualityReport, renderTaskQualityReview(taskReview), 'utf-8')
  if (!stopped) {
    stopped = appendStep(steps, {
      name: 'task-quality',
      verdict: taskReview.verdict === 'PASS' ? 'PASS' : 'FAIL',
      detail: taskReview.verdict === 'PASS' ? 'Current task is reviewable.' : `Task quality returned ${taskReview.verdict}.`
    })
  }

  if (!stopped) {
    if (!existsSync(paths.superpowerSources)) {
      stopped = appendStep(steps, {
        name: 'superpower-discipline',
        verdict: 'FAIL',
        detail: '`superpower:scan` must run before round gate.'
      })
    } else {
      const manifest = readJsonSafe(paths.superpowerSources) as SuperpowerSourceManifest
      const discipline = checkSuperpowerDiscipline(manifest, collectRoundDisciplineEvidence(paths.currentDir, taskMarkdown))
      writeFileSync(paths.disciplineReport, renderDisciplineReport(discipline, manifest), 'utf-8')
      stopped = appendStep(steps, {
        name: 'superpower-discipline',
        verdict: discipline.verdict === 'PASS' ? 'PASS' : 'FAIL',
        detail: discipline.verdict === 'PASS' ? 'Current-round Superpower discipline evidence passed.' : 'Required Superpower discipline evidence is missing or insufficient.'
      })
    }
  }

  if (!stopped) {
    const gatesRaw = readJsonSafe(paths.qualityGates)
    const configs = loadGateConfig(gatesRaw)
    const plans = planGateExecutions(configs)
    const gateResults = await runConfiguredGates(plans, runner)
    const validation = evaluateGateResults(gateResults, configs)
    writeFileSync(paths.validationReport, renderValidationReport({
      verdict: validation,
      taskId: 'N/A',
      timestamp,
      readinessVerdict: 'READY'
    }), 'utf-8')
    stopped = appendStep(steps, {
      name: 'local-validation',
      verdict: validation.overall === 'PASS' ? 'PASS' : 'FAIL',
      detail: validation.overall === 'PASS' ? 'All configured local quality gates passed.' : `Blocking failures: ${validation.blockingFailures.join('; ')}`
    })
  }

  if (!stopped) {
    try {
      const prompt = buildReviewPrompt(buildReviewEvidence(root))
      writeFileSync(paths.codexReviewPrompt, prompt, 'utf-8')
      appendStep(steps, {
        name: 'codex-prompt-readiness',
        verdict: 'PASS',
        detail: 'Read-only Codex review prompt generated.'
      })
    } catch (error) {
      stopped = appendStep(steps, {
        name: 'codex-prompt-readiness',
        verdict: 'FAIL',
        detail: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const result: RoundGateResult = stopped
    ? { ...stopped, reportPath: paths.qualityReadinessReport }
    : {
      verdict: 'PASS',
      steps,
      promptPath: paths.codexReviewPrompt,
      reportPath: paths.qualityReadinessReport
    }
  writeFileSync(paths.qualityReadinessReport, renderRoundGateReport(result, timestamp), 'utf-8')
  return result
}
