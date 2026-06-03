import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { z } from 'zod'
import { getAegisRuntimePaths } from './paths.js'
import { stringifyAegisRunState, type AegisRunState } from './run-state.js'
import type { DecisionRequestInput } from './navigation-refresh.js'

const AegisConfigSchema = z.object({
  limits: z.object({
    max_auto_rounds: z.number().int().min(1).max(100).default(5),
    max_repair_attempts: z.number().int().min(1).max(10).default(2)
  }).default({
    max_auto_rounds: 5,
    max_repair_attempts: 2
  })
}).passthrough()

export type AegisProgressionDecision = {
  state: AegisRunState
  preserveWorkInstruction: boolean
  decisionRequest?: DecisionRequestInput
  humanHandoff?: string
  archiveTaskId?: string
  archiveTimestamp?: string
  modeDecision: string
}

function readLimits(root: string): { maxAutoRounds: number; maxRepairAttempts: number } {
  const paths = getAegisRuntimePaths(root)
  if (!existsSync(paths.aegisConfig)) {
    return { maxAutoRounds: 5, maxRepairAttempts: 2 }
  }
  const config = AegisConfigSchema.parse(JSON.parse(readFileSync(paths.aegisConfig, 'utf-8')))
  return {
    maxAutoRounds: config.limits.max_auto_rounds,
    maxRepairAttempts: config.limits.max_repair_attempts
  }
}

function decisionRequest(decision: string, context: string): DecisionRequestInput {
  return {
    decision,
    options: [
      'Approve the next Aegis transition and rerun Aegis.',
      'Revise the current task, evidence, or run-state before continuing.'
    ],
    context
  }
}

function renderRetryHandoff(state: AegisRunState, maxRepairAttempts: number): string {
  return [
    '# Human Handoff',
    '',
    '## Reason',
    '',
    `Aegis stopped because repair attempts reached the configured limit (${maxRepairAttempts}).`,
    '',
    '## Current State',
    '',
    `- Task: ${state.task_id ?? 'No current task.'}`,
    `- Mode: ${state.mode}`,
    `- Last verdict: ${state.last_verdict ?? 'Not set.'}`,
    `- Retry count: ${state.retry_count}`,
    '',
    '## Boundary',
    '',
    'Claude Code must ask the human whether to revise scope, accept risk, or stop the task.',
    ''
  ].join('\n')
}

function sanitizeArchiveName(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'no-task'
}

export function archiveCompletedRound(root: string, taskId: string, timestamp: string): {
  archivePath: string
  copiedFiles: string[]
} {
  const paths = getAegisRuntimePaths(root)
  const archivePath = resolve(paths.archiveDir, sanitizeArchiveName(taskId))
  mkdirSync(archivePath, { recursive: true })

  const candidates = [
    paths.currentTask,
    paths.roundSummary,
    paths.workInstruction,
    paths.planningEvidence,
    paths.tddEvidence,
    paths.debuggingEvidence,
    paths.verificationEvidence,
    paths.reviewEvidence,
    paths.safetyReport,
    paths.taskQualityReport,
    paths.disciplineReport,
    paths.qualityReadinessReport,
    paths.validationReport,
    paths.codexReviewPrompt,
    paths.codexReviewRaw,
    paths.codexReview,
    paths.superpowerSources,
    paths.superpowerSummary
  ]
  const copiedFiles: string[] = []

  for (const file of candidates) {
    if (!existsSync(file)) continue
    const target = resolve(archivePath, basename(file))
    copyFileSync(file, target)
    copiedFiles.push(basename(file))
  }

  const manifest = {
    schema_version: 1,
    task_id: taskId,
    archived_at: timestamp,
    copied_files: copiedFiles
  }
  writeFileSync(resolve(archivePath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
  copiedFiles.push('manifest.json')

  return { archivePath, copiedFiles }
}

export function applyProgressionPolicy(
  root: string,
  state: AegisRunState,
  timestamp: string
): AegisProgressionDecision {
  const limits = readLimits(root)

  if (state.phase === 'need-fix' && state.retry_count >= limits.maxRepairAttempts) {
    const nextState = {
      ...state,
      phase: 'human-handoff' as const,
      last_verdict: 'NEED_HUMAN' as const,
      updated_at: timestamp
    }
    return {
      state: nextState,
      preserveWorkInstruction: true,
      humanHandoff: renderRetryHandoff(state, limits.maxRepairAttempts),
      modeDecision: `Stopped after ${state.retry_count} repair attempt(s); max is ${limits.maxRepairAttempts}.`
    }
  }

  if (state.phase === 'need-fix') {
    if (state.mode === 'ask') {
      return {
        state: {
          ...state,
          phase: 'decision-request',
          updated_at: timestamp
        },
        preserveWorkInstruction: true,
        decisionRequest: decisionRequest(
          'Codex returned NEED_FIX. Should Claude Code perform the bounded repair instruction?',
          `Retry count: ${state.retry_count}. Aegis ask mode stops before construction.`
        ),
        modeDecision: 'Ask mode stopped before repair construction.'
      }
    }

    return {
      state: {
        ...state,
        phase: 'waiting-for-construction',
        updated_at: timestamp
      },
      preserveWorkInstruction: true,
      modeDecision: `${state.mode} mode allows bounded NEED_FIX repair construction.`
    }
  }

  if (state.phase === 'passed') {
    const nextRoundCount = state.round_count + 1
    if (state.mode === 'ask') {
      return {
        state: {
          ...state,
          phase: 'decision-request',
          round_count: nextRoundCount,
          updated_at: timestamp
        },
        preserveWorkInstruction: false,
        archiveTaskId: state.task_id ?? 'no-task',
        archiveTimestamp: timestamp,
        decisionRequest: decisionRequest(
          'Codex returned PASS. Should Aegis prepare the next task?',
          `Completed rounds: ${nextRoundCount}. Aegis ask mode stops after meaningful phase boundaries.`
        ),
        modeDecision: 'Ask mode stopped after PASS.'
      }
    }

    if (nextRoundCount >= limits.maxAutoRounds) {
      return {
        state: {
          ...state,
          phase: 'decision-request',
          round_count: nextRoundCount,
          updated_at: timestamp
        },
        preserveWorkInstruction: false,
        archiveTaskId: state.task_id ?? 'no-task',
        archiveTimestamp: timestamp,
        decisionRequest: decisionRequest(
          'Aegis reached the configured round limit. Should it continue selecting tasks?',
          `Completed rounds: ${nextRoundCount}. Limit: ${limits.maxAutoRounds}.`
        ),
        modeDecision: `Stopped at round limit ${limits.maxAutoRounds}.`
      }
    }

    return {
      state: {
        ...state,
        task_id: null,
        phase: 'ready-for-task',
        round_count: nextRoundCount,
        updated_at: timestamp
      },
      preserveWorkInstruction: false,
      archiveTaskId: state.task_id ?? 'no-task',
      archiveTimestamp: timestamp,
      modeDecision: `${state.mode} mode advanced after PASS to next-task selection.`
    }
  }

  return {
    state,
    preserveWorkInstruction: false,
    modeDecision: 'No mode transition applied.'
  }
}

export function writeProgressionSideEffects(root: string, decision: AegisProgressionDecision): void {
  const paths = getAegisRuntimePaths(root)
  if (decision.archiveTaskId && decision.archiveTimestamp) {
    archiveCompletedRound(root, decision.archiveTaskId, decision.archiveTimestamp)
  }
  if (decision.humanHandoff) {
    writeFileSync(paths.humanHandoff, decision.humanHandoff, 'utf-8')
  }
  writeFileSync(paths.runState, stringifyAegisRunState(decision.state), 'utf-8')
}
