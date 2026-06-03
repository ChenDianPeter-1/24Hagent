import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { AegisRuntimePaths } from './paths.js'
import {
  renderProjectProgress,
  renderStatus,
  renderWorkInstruction
} from './navigation.js'
import {
  parseAegisRunStateJson,
  stringifyAegisRunState,
  type AegisRunState
} from './run-state.js'

const SUPERPOWER_SOURCE = 'D:\\AAAOddsAndEnds\\PROGRAM\\superpowers'

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function firstNonEmptyLine(text: string): string | undefined {
  return text.split('\n').map((line) => line.trim()).find(Boolean)
}

function updateState(paths: AegisRuntimePaths, patch: Partial<AegisRunState>): AegisRunState {
  const state = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const next = {
    ...state,
    ...patch,
    updated_at: new Date().toISOString()
  }
  writeFileSync(paths.runState, stringifyAegisRunState(next), 'utf-8')
  return next
}

function renderDraftTemplate(existingBlueprint: string): string {
  if (existingBlueprint.trim()) {
    return [
      existingBlueprint.trim(),
      '',
      '## Draft Notes',
      '',
      `- Claude Code should revise this draft using Superpower source discipline from \`${SUPERPOWER_SOURCE}\`.`,
      '- Aegis does not call Superpower directly; it records this draft for human confirmation.',
      ''
    ].join('\n')
  }

  return [
    '# Aegis Project Blueprint Draft',
    '',
    '## Product Goal',
    '',
    'Rewrite 24Hagent into Aegis.',
    '',
    '## Product Formula',
    '',
    'Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review',
    '',
    '## MVP Scope',
    '',
    '- Define the confirmed project blueprint.',
    '- Generate scoped current tasks from the confirmed blueprint.',
    '- Preserve Aegis as a non-interactive delivery gate inside Claude Code.',
    '',
    '## Out Of Scope',
    '',
    '- Aegis directly calling Superpower.',
    '- Aegis acting as an autonomous coding agent.',
    '',
    '## Draft Notes',
    '',
    `- Claude Code should revise this draft using Superpower source discipline from \`${SUPERPOWER_SOURCE}\`.`,
    '- Aegis does not call Superpower directly; it records this draft for human confirmation.',
    ''
  ].join('\n')
}

export function renderBlueprintSummary(draft: string): string {
  const productGoal = firstNonEmptyLine(section(draft, 'Product Goal')) || 'Not specified.'
  const productFormula = firstNonEmptyLine(section(draft, 'Product Formula')) || 'Not specified.'
  const mvpScope = section(draft, 'MVP Scope') || 'Not specified.'

  return [
    '# Blueprint Summary',
    '',
    '## Product Goal',
    '',
    productGoal,
    '',
    '## Product Formula',
    '',
    productFormula,
    '',
    '## MVP Scope',
    '',
    mvpScope,
    '',
    '## Confirmation',
    '',
    'Ask the human to confirm this blueprint or request a revision before current-task generation.',
    ''
  ].join('\n')
}

export function renderBlueprintDecisionRequest(summary: string): string {
  return [
    '# Decision Request',
    '',
    '## Decision',
    '',
    'Confirm the Aegis project blueprint or request a revision.',
    '',
    '## Options',
    '',
    '- Confirm: Claude Code may run `aegis blueprint:confirm`.',
    '- Revise: Claude Code should edit `.aegis/blueprint/project-blueprint.draft.md` and rerun `aegis blueprint:summary`.',
    '',
    '## Blueprint Summary',
    '',
    summary.trim(),
    ''
  ].join('\n')
}

export function startBlueprintFlow(paths: AegisRuntimePaths): string {
  mkdirSync(paths.blueprintDir, { recursive: true })
  mkdirSync(paths.currentDir, { recursive: true })

  const existingBlueprint = existsSync(paths.projectBlueprint)
    ? readFileSync(paths.projectBlueprint, 'utf-8')
    : ''
  if (!existsSync(paths.projectBlueprintDraft)) {
    writeFileSync(paths.projectBlueprintDraft, renderDraftTemplate(existingBlueprint), 'utf-8')
  }

  const state = updateState(paths, {
    task_id: null,
    phase: 'blueprint-draft',
    last_verdict: 'blueprint-draft-started'
  })
  const nextAction = 'Claude Code should use Superpower discipline to revise `.aegis/blueprint/project-blueprint.draft.md`, then run `aegis blueprint:summary`.'
  const input = {
    state,
    projectGoal: 'Rewrite 24Hagent into Aegis.',
    nextAction,
    risks: ['Blueprint is not confirmed yet.']
  }

  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')
  return renderStatus(input)
}

export function summarizeBlueprintFlow(paths: AegisRuntimePaths): string {
  if (!existsSync(paths.projectBlueprintDraft)) {
    throw new Error('Missing `.aegis/blueprint/project-blueprint.draft.md`; run `aegis blueprint:start` first.')
  }

  mkdirSync(paths.currentDir, { recursive: true })
  const draft = readFileSync(paths.projectBlueprintDraft, 'utf-8')
  const summary = renderBlueprintSummary(draft)
  const decisionRequest = renderBlueprintDecisionRequest(summary)
  writeFileSync(paths.blueprintSummary, summary, 'utf-8')
  writeFileSync(paths.decisionRequest, decisionRequest, 'utf-8')

  const state = updateState(paths, {
    task_id: null,
    phase: 'decision-request',
    last_verdict: 'blueprint-confirmation-needed'
  })
  const nextAction = 'Claude Code should ask the user to confirm `.aegis/current/decision-request.md` before running `aegis blueprint:confirm`.'
  const input = {
    state,
    projectGoal: firstNonEmptyLine(section(draft, 'Product Goal')),
    nextAction,
    risks: ['Blueprint confirmation is pending.']
  }

  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')
  return decisionRequest
}

export function confirmBlueprintFlow(paths: AegisRuntimePaths): string {
  if (!existsSync(paths.projectBlueprintDraft)) {
    throw new Error('Missing `.aegis/blueprint/project-blueprint.draft.md`; run `aegis blueprint:start` first.')
  }

  const draft = readFileSync(paths.projectBlueprintDraft, 'utf-8')
  writeFileSync(paths.projectBlueprint, `${draft.trim()}\n`, 'utf-8')
  const summary = renderBlueprintSummary(draft)
  writeFileSync(paths.blueprintSummary, summary, 'utf-8')

  const state = updateState(paths, {
    task_id: null,
    phase: 'ready-for-task',
    last_verdict: 'blueprint-confirmed'
  })
  const nextAction = 'Generate or select the next concrete current task from the confirmed blueprint.'
  const input = {
    state,
    projectGoal: firstNonEmptyLine(section(draft, 'Product Goal')),
    nextAction,
    risks: []
  }

  writeFileSync(paths.status, renderStatus(input), 'utf-8')
  writeFileSync(paths.workInstruction, renderWorkInstruction(input), 'utf-8')
  writeFileSync(paths.projectProgress, renderProjectProgress(input), 'utf-8')
  return renderStatus(input)
}
