import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { AegisRuntimePaths } from './paths.js'
import {
  renderProjectProgress,
  renderStatus,
  renderWorkInstruction,
  type NavigationInput
} from './navigation.js'

export type DecisionRequestInput = {
  decision: string
  options: string[]
  context?: string
}

export type NavigationRefreshOptions = {
  preserveWorkInstruction?: boolean
  decisionRequest?: DecisionRequestInput
}

export type NavigationRefreshResult = {
  status: string
  workInstruction?: string
  projectProgress: string
  decisionRequest?: string
}

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function firstNonEmptyLine(text: string): string | undefined {
  return text.split('\n').map((line) => line.trim()).find(Boolean)
}

export function readNavigationContext(paths: AegisRuntimePaths): {
  currentTaskTitle?: string
  projectGoal?: string
} {
  const currentTaskMd = existsSync(paths.currentTask) ? readFileSync(paths.currentTask, 'utf-8') : ''
  const projectBlueprintMd = existsSync(paths.projectBlueprint) ? readFileSync(paths.projectBlueprint, 'utf-8') : ''

  return {
    currentTaskTitle: firstNonEmptyLine(section(currentTaskMd, 'Title')),
    projectGoal: firstNonEmptyLine(section(projectBlueprintMd, 'Product Goal'))
  }
}

export function renderDecisionRequest(input: DecisionRequestInput): string {
  return [
    '# Decision Request',
    '',
    '## Decision',
    '',
    input.decision,
    '',
    '## Options',
    '',
    ...input.options.map(option => `- ${option}`),
    '',
    '## Context',
    '',
    input.context || 'No additional context.',
    ''
  ].join('\n')
}

function defaultDecisionRequest(input: NavigationInput): DecisionRequestInput {
  return {
    decision: input.nextAction || 'Aegis needs a human decision before continuing.',
    options: [
      'Confirm the requested action and rerun Aegis.',
      'Revise the relevant Aegis file, then rerun Aegis.'
    ],
    context: [
      `Phase: ${input.state.phase}`,
      `Current task: ${input.currentTaskTitle || input.state.task_id || 'No current task.'}`,
      input.risks?.length ? `Risks: ${input.risks.join('; ')}` : 'Risks: none recorded.'
    ].join('\n')
  }
}

export function refreshNavigation(
  paths: AegisRuntimePaths,
  input: NavigationInput,
  options: NavigationRefreshOptions = {}
): NavigationRefreshResult {
  mkdirSync(paths.currentDir, { recursive: true })
  mkdirSync(paths.blueprintDir, { recursive: true })

  const status = renderStatus(input)
  const projectProgress = renderProjectProgress(input)
  writeFileSync(paths.status, status, 'utf-8')
  writeFileSync(paths.projectProgress, projectProgress, 'utf-8')

  const result: NavigationRefreshResult = { status, projectProgress }
  if (!options.preserveWorkInstruction) {
    const workInstruction = renderWorkInstruction(input)
    writeFileSync(paths.workInstruction, workInstruction, 'utf-8')
    result.workInstruction = workInstruction
  }

  if (input.state.phase === 'decision-request' || options.decisionRequest) {
    const decisionRequest = renderDecisionRequest(options.decisionRequest || defaultDecisionRequest(input))
    writeFileSync(paths.decisionRequest, decisionRequest, 'utf-8')
    result.decisionRequest = decisionRequest
  }

  return result
}
