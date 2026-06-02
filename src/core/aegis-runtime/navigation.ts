import type { AegisRunState } from './run-state.js'

export type NavigationInput = {
  state: AegisRunState
  projectGoal?: string
  currentTaskTitle?: string
  nextAction?: string
  lastResult?: string
  risks?: string[]
}

export function renderStatus(input: NavigationInput): string {
  const risks = input.risks?.length
    ? input.risks.map((risk) => `- ${risk}`).join('\n')
    : '- None recorded.'

  return [
    '# Aegis Status',
    '',
    '## Phase',
    '',
    `\`${input.state.phase}\``,
    '',
    '## Mode',
    '',
    `\`${input.state.mode}\``,
    '',
    '## Current Task',
    '',
    input.state.task_id ? `\`${input.state.task_id}\`` : 'No current task.',
    '',
    '## Current Task Title',
    '',
    input.currentTaskTitle || 'Not set.',
    '',
    '## Last Result',
    '',
    input.lastResult || input.state.last_verdict || 'Not set.',
    '',
    '## Next Action',
    '',
    input.nextAction || 'Run `aegis` to refresh status.',
    '',
    '## Risks',
    '',
    risks,
    ''
  ].join('\n')
}

export function renderWorkInstruction(input: NavigationInput): string {
  return [
    '# Work Instruction',
    '',
    '## Task',
    '',
    input.currentTaskTitle || input.state.task_id || 'No current task.',
    '',
    '## Instruction',
    '',
    input.nextAction || 'Claude Code should wait for Aegis to generate the next instruction.',
    '',
    '## Boundaries',
    '',
    '- Do not exceed `current-task.md` file scope.',
    '- Do not perform forbidden Git or release actions.',
    '- Leave evidence for the required Superpower discipline.',
    ''
  ].join('\n')
}

export function renderProjectProgress(input: NavigationInput): string {
  const risks = input.risks?.length
    ? input.risks.map((risk) => `- ${risk}`).join('\n')
    : '- None recorded.'

  return [
    '# Aegis Project Progress',
    '',
    '## Project Goal',
    '',
    input.projectGoal || 'Not set.',
    '',
    '## Current Phase',
    '',
    `\`${input.state.phase}\``,
    '',
    '## Current Task',
    '',
    input.currentTaskTitle || input.state.task_id || 'No current task.',
    '',
    '## Next Action',
    '',
    input.nextAction || 'Run `aegis` to continue.',
    '',
    '## Risks',
    '',
    risks,
    ''
  ].join('\n')
}
