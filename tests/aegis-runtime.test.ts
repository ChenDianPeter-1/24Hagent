import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import {
  getAegisRuntimePaths,
  generateCurrentTaskFromBlueprint,
  isAegisStopPhase,
  parseAegisRunStateJson,
  refreshNavigation,
  renderProjectProgress,
  renderBlueprintSummary,
  renderCurrentTaskMarkdown,
  renderStatus,
  renderWorkInstruction,
  stringifyAegisRunState,
  type AegisRunState
} from '../src/core/aegis-runtime/index.js'

const state = (overrides: Partial<AegisRunState> = {}): AegisRunState => ({
  schema_version: 1,
  project_id: 'aegis-rewrite',
  task_id: '20260602-runtime',
  phase: 'paused',
  mode: 'auto',
  last_verdict: 'PASS',
  retry_count: 0,
  updated_at: '2026-06-02T20:40:00+08:00',
  ...overrides
})

describe('Aegis runtime paths', () => {
  it('centralizes .aegis runtime file paths', () => {
    const paths = getAegisRuntimePaths('D:/repo')

    expect(paths.runtimeDir).toBe(resolve('D:/repo', '.aegis'))
    expect(paths.qualityGates).toBe(resolve('D:/repo', '.aegis/config/quality-gates.json'))
    expect(paths.claudeCodeContract).toBe(resolve('D:/repo', '.aegis/config/claude-code-contract.md'))
    expect(paths.projectBlueprintDraft).toBe(resolve('D:/repo', '.aegis/blueprint/project-blueprint.draft.md'))
    expect(paths.blueprintSummary).toBe(resolve('D:/repo', '.aegis/blueprint/blueprint-summary.md'))
    expect(paths.projectProgress).toBe(resolve('D:/repo', '.aegis/blueprint/project-progress.md'))
    expect(paths.currentTask).toBe(resolve('D:/repo', '.aegis/current/current-task.md'))
    expect(paths.runState).toBe(resolve('D:/repo', '.aegis/state/run-state.json'))
  })
})

describe('Aegis blueprint flow renderers', () => {
  it('summarizes blueprint drafts for human confirmation', () => {
    const md = renderBlueprintSummary([
      '# Draft',
      '',
      '## Product Goal',
      '',
      'Make AI coding work reviewable.',
      '',
      '## Product Formula',
      '',
      'Aegis = gates + Codex review',
      '',
      '## MVP Scope',
      '',
      '- Blueprint confirmation',
      '- Task generation',
      ''
    ].join('\n'))

    expect(md).toContain('# Blueprint Summary')
    expect(md).toContain('Make AI coding work reviewable.')
    expect(md).toContain('Aegis = gates + Codex review')
    expect(md).toContain('- Blueprint confirmation')
    expect(md).toContain('Ask the human to confirm')
  })
})

describe('Aegis current-task generation', () => {
  it('generates formal current tasks from blueprint content', () => {
    const task = generateCurrentTaskFromBlueprint([
      '# Blueprint',
      '',
      '## Product Goal',
      '',
      'Make AI coding work reviewable.',
      '',
      '## MVP Scope',
      '',
      '- Generate formal current tasks',
      '- Enforce task quality gates',
      ''
    ].join('\n'), 'T-GENERATED')
    const md = renderCurrentTaskMarkdown(task)

    expect(task.task_id).toBe('T-GENERATED')
    expect(task.title).toContain('Generate formal current tasks')
    expect(task.file_scope).toContain('src')
    expect(task.definition_of_done.length).toBeGreaterThanOrEqual(2)
    expect(task.acceptance_checks).toContain('npm run typecheck')
    expect(md).toContain('## File Scope')
    expect(md).toContain('## Stop Rule')
  })
})

describe('Aegis run state', () => {
  it('parses the new minimal run state shape', () => {
    const parsed = parseAegisRunStateJson(JSON.stringify(state({ phase: 'waiting-for-construction' })))

    expect(parsed.schema_version).toBe(1)
    expect(parsed.project_id).toBe('aegis-rewrite')
    expect(parsed.phase).toBe('waiting-for-construction')
    expect(parsed.mode).toBe('auto')
  })

  it('rejects unknown phases', () => {
    expect(() =>
      parseAegisRunStateJson(JSON.stringify({ ...state(), phase: 'ASK_CODEX_REVIEW' }))
    ).toThrow()
  })

  it('keeps run state JSON small and stable', () => {
    const raw = stringifyAegisRunState(state({ task_id: null, last_verdict: null }))

    expect(raw).toContain('"schema_version": 1')
    expect(raw).toContain('"task_id": null')
    expect(raw.endsWith('\n')).toBe(true)
  })

  it('identifies phases that require Aegis to stop', () => {
    expect(isAegisStopPhase('waiting-for-construction')).toBe(true)
    expect(isAegisStopPhase('decision-request')).toBe(true)
    expect(isAegisStopPhase('validating')).toBe(false)
  })
})

describe('Aegis navigation renderers', () => {
  it('renders status from run state without terminal interaction', () => {
    const md = renderStatus({
      state: state({ phase: 'decision-request', mode: 'ask' }),
      currentTaskTitle: 'Confirm blueprint',
      nextAction: 'Claude Code should ask the user to confirm the blueprint.',
      risks: ['Blueprint is not confirmed.']
    })

    expect(md).toContain('# Aegis Status')
    expect(md).toContain('`decision-request`')
    expect(md).toContain('Confirm blueprint')
    expect(md).toContain('Blueprint is not confirmed.')
  })

  it('renders Claude Code construction instructions', () => {
    const md = renderWorkInstruction({
      state: state({ phase: 'waiting-for-construction' }),
      currentTaskTitle: 'Implement runtime paths',
      nextAction: 'Edit only the runtime helper files.'
    })

    expect(md).toContain('# Work Instruction')
    expect(md).toContain('Implement runtime paths')
    expect(md).toContain('Do not exceed `current-task.md` file scope.')
  })

  it('renders project progress as the resume entrypoint', () => {
    const md = renderProjectProgress({
      state: state({ phase: 'paused' }),
      projectGoal: 'Rewrite 24Hagent into Aegis.',
      nextAction: 'Continue Phase 4.'
    })

    expect(md).toContain('# Aegis Project Progress')
    expect(md).toContain('Rewrite 24Hagent into Aegis.')
    expect(md).toContain('Continue Phase 4.')
  })
})

describe('Aegis navigation refresh', () => {
  it('recovers stale derived navigation files from current state', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-nav-refresh-'))
    try {
      const paths = getAegisRuntimePaths(dir)
      mkdirSync(paths.currentDir, { recursive: true })
      mkdirSync(paths.blueprintDir, { recursive: true })
      writeFileSync(paths.status, 'stale status', 'utf-8')

      refreshNavigation(paths, {
        state: state({ phase: 'task-ready', task_id: 'T-NAV' }),
        currentTaskTitle: 'Refresh navigation',
        projectGoal: 'Rewrite 24Hagent into Aegis.',
        nextAction: 'Run `aegis task:review`.',
        risks: []
      })

      expect(readFileSync(paths.status, 'utf-8')).toContain('`task-ready`')
      expect(readFileSync(paths.status, 'utf-8')).toContain('Refresh navigation')
      expect(readFileSync(paths.projectProgress, 'utf-8')).toContain('Rewrite 24Hagent into Aegis.')
      expect(readFileSync(paths.workInstruction, 'utf-8')).toContain('Run `aegis task:review`.')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('renders decision requests when state needs human input', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-nav-decision-'))
    try {
      const paths = getAegisRuntimePaths(dir)

      refreshNavigation(paths, {
        state: state({ phase: 'decision-request', task_id: null }),
        projectGoal: 'Rewrite 24Hagent into Aegis.',
        nextAction: 'Ask the user to confirm the blueprint.',
        risks: ['Blueprint is not confirmed.']
      })

      const decision = readFileSync(paths.decisionRequest, 'utf-8')
      expect(decision).toContain('# Decision Request')
      expect(decision).toContain('Ask the user to confirm the blueprint.')
      expect(decision).toContain('Blueprint is not confirmed.')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('preserves bounded work instructions when requested', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-nav-preserve-'))
    try {
      const paths = getAegisRuntimePaths(dir)
      mkdirSync(paths.currentDir, { recursive: true })
      writeFileSync(paths.workInstruction, 'keep bounded Codex repair', 'utf-8')

      refreshNavigation(paths, {
        state: state({ phase: 'waiting-for-construction', task_id: 'T-FIX' }),
        currentTaskTitle: 'Repair task',
        nextAction: 'Claude Code should repair only bounded fixes.',
        risks: []
      }, { preserveWorkInstruction: true })

      expect(readFileSync(paths.workInstruction, 'utf-8')).toBe('keep bounded Codex repair')
      expect(readFileSync(paths.status, 'utf-8')).toContain('`waiting-for-construction`')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
