import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { TaskPackage } from '../schemas/task-package.js'
import { refreshNavigation } from './navigation-refresh.js'
import type { AegisRuntimePaths } from './paths.js'
import { parseAegisRunStateJson, stringifyAegisRunState } from './run-state.js'

function section(md: string, heading: string): string {
  const re = new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  return (md.match(re)?.[1] ?? '').trim()
}

function bullets(text: string): string[] {
  return text.split(/\r?\n/)
    .map(line => line.match(/^-\s+(?:\[[ x]\]\s*)?(.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line))
}

function slug(text: string): string {
  return text.toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'next-task'
}

function taskTitleFromBlueprint(blueprint: string): string {
  const scopeItems = bullets(section(blueprint, 'MVP Scope'))
  const next = scopeItems.find(item => !/reposition|introduce|preserve existing/i.test(item)) || scopeItems[0]
  return next ? `Deliver ${next.replace(/\.$/, '')}` : 'Deliver the next Aegis blueprint task'
}

export function renderCurrentTaskMarkdown(task: TaskPackage): string {
  const fileScope = task.file_scope.map(item => `- ${item}`).join('\n')
  const dod = task.definition_of_done.map(item => `- [${item.checked ? 'x' : ' '}] ${item.content}`).join('\n')

  return [
    '# Current Task',
    '',
    '## Task ID',
    '',
    `\`${task.task_id}\``,
    '',
    '## Title',
    '',
    task.title,
    '',
    '## Specification',
    '',
    task.specification,
    '',
    '## File Scope',
    '',
    fileScope,
    '',
    '## Definition of DoD',
    '',
    dod,
    '',
    '## Acceptance Checks',
    '',
    '```bash',
    task.acceptance_checks,
    '```',
    '',
    '## Stop Rule',
    '',
    task.stop_rule,
    ''
  ].join('\n')
}

export function generateCurrentTaskFromBlueprint(blueprint: string, taskId?: string): TaskPackage {
  const title = taskTitleFromBlueprint(blueprint)
  const id = taskId || `task-${slug(title)}`

  return {
    task_id: id,
    title,
    specification: [
      'Turn the next confirmed blueprint item into one bounded Aegis implementation step.',
      '',
      'Claude Code must keep the change small, use the current Aegis gates, and leave round evidence before Codex review.',
      '',
      `Blueprint item: ${title.replace(/^Deliver\s+/, '')}`
    ].join('\n'),
    file_scope: [
      '.aegis/current',
      '.aegis/blueprint/project-progress.md',
      '.aegis/state/run-state.json',
      'docs',
      'src',
      'tests'
    ],
    definition_of_done: [
      { content: 'The selected blueprint item is implemented as one bounded Aegis change', checked: false },
      { content: 'Task evidence files describe planning, tests, verification, and review focus', checked: false },
      { content: 'Focused tests and full validation pass before Codex review', checked: false }
    ],
    acceptance_checks: [
      'npm run typecheck',
      'npm run build',
      'npm run lint',
      'npm test',
      'node dist\\cli\\main.js task:review'
    ].join('\n'),
    stop_rule: 'Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, high-risk file scope, or files outside File Scope.'
  }
}

export function generateNextCurrentTask(paths: AegisRuntimePaths): string {
  if (!existsSync(paths.projectBlueprint)) {
    throw new Error('Missing confirmed `.aegis/blueprint/project-blueprint.md`; confirm a blueprint before generating a task.')
  }

  mkdirSync(paths.currentDir, { recursive: true })
  const blueprint = readFileSync(paths.projectBlueprint, 'utf-8')
  const task = generateCurrentTaskFromBlueprint(blueprint, `next-${slug(taskTitleFromBlueprint(blueprint))}`)
  const taskMd = renderCurrentTaskMarkdown(task)
  writeFileSync(paths.currentTask, taskMd, 'utf-8')

  const previousState = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))
  const state = {
    ...previousState,
    task_id: task.task_id,
    phase: 'task-ready' as const,
    last_verdict: 'current-task-generated',
    updated_at: new Date().toISOString()
  }
  writeFileSync(paths.runState, stringifyAegisRunState(state), 'utf-8')

  const nextAction = 'Run `aegis task:review` to check the generated current task before construction.'
  const input = {
    state,
    projectGoal: section(blueprint, 'Product Goal').split(/\r?\n/).find(Boolean),
    currentTaskTitle: task.title,
    nextAction,
    risks: []
  }

  refreshNavigation(paths, input)

  return taskMd
}
