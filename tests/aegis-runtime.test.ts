import { describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { FakeCommandRunner } from '../src/adapters/shell/command-runner.js'
import {
  getAegisRuntimePaths,
  generateCurrentTaskFromBlueprint,
  isAegisStopPhase,
  parseAegisRunStateJson,
  refreshNavigation,
  renderProjectProgress,
  routeCodexReviewResult,
  applyProgressionPolicy,
  detectForbiddenActions,
  renderCommitSuggestion,
  runSafetyCheck,
  runRoundGate,
  renderBlueprintSummary,
  renderCurrentTaskMarkdown,
  renderStatus,
  renderWorkInstruction,
  stringifyAegisRunState,
  type AegisRunState
} from '../src/core/aegis-runtime/index.js'
import type { ReviewResult } from '../src/core/schemas/review-result.js'

const state = (overrides: Partial<AegisRunState> = {}): AegisRunState => ({
  schema_version: 1,
  project_id: 'aegis-rewrite',
  task_id: '20260602-runtime',
  phase: 'paused',
  mode: 'auto',
  last_verdict: 'PASS',
  round_count: 0,
  retry_count: 0,
  updated_at: '2026-06-02T20:40:00+08:00',
  ...overrides
})

const currentTask = (title = 'Implement round gate') => [
  '# Current Task',
  '',
  '## Task ID',
  '',
  '`T-ROUND`',
  '',
  '## Title',
  '',
  title,
  '',
  '## Specification',
  '',
  'Implement a bounded Aegis round gate that packages quality evidence for Codex review.',
  '',
  '## File Scope',
  '',
  '- .aegis/current',
  '- src/core/aegis-runtime',
  '- src/cli',
  '- tests',
  '',
  '## Definition of DoD',
  '',
  '- [ ] Round gate checks task quality before validation.',
  '- [ ] Round gate generates a read-only Codex prompt only after local gates pass.',
  '',
  '## Acceptance Checks',
  '',
  '```bash',
  'npm run typecheck',
  'npm test',
  '```',
  '',
  '## Stop Rule',
  '',
  'Stop and ask a human before changing Git history, deployment, release, publish, or dependency boundaries.',
  ''
].join('\n')

function write(path: string, content: string): void {
  mkdirSync(resolve(path, '..'), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

function initGitRepo(root: string): void {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'aegis@example.test'], { cwd: root })
  execFileSync('git', ['config', 'user.name', 'Aegis Test'], { cwd: root })
  writeFileSync(resolve(root, 'README.md'), '# test repo\n', 'utf-8')
  execFileSync('git', ['add', '.'], { cwd: root })
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: root, stdio: 'ignore' })
}

function writeRoundFixture(root: string): void {
  const paths = getAegisRuntimePaths(root)
  mkdirSync(paths.configDir, { recursive: true })
  mkdirSync(paths.currentDir, { recursive: true })
  mkdirSync(paths.stateDir, { recursive: true })
  write(paths.currentTask, currentTask())
  write(paths.codexRubric, 'Return only PASS, NEED_FIX, or NEED_HUMAN with cited evidence.')
  write(paths.superpowerSummary, '# Superpower Source Summary\n\nSources present.')
  write(paths.superpowerSources, JSON.stringify({
    schema_version: 1,
    source_root: 'D:/superpowers',
    generated_at: '2026-06-03T00:00:00Z',
    sources: [
      'brainstorming',
      'writing-plans',
      'test-driven-development',
      'systematic-debugging',
      'requesting-code-review',
      'verification-before-completion',
      'using-git-worktrees',
      'finishing-a-development-branch'
    ].map(name => ({ kind: 'skill', name, path: `D:/superpowers/skills/${name}/SKILL.md`, summary: `${name} skill.` }))
  }, null, 2))
  write(paths.planningEvidence, 'Planned the scoped round gate approach, file scope, risk boundary, and acceptance checks.')
  write(paths.tddEvidence, 'Wrote focused tests before implementation and made the round gate tests pass.')
  write(paths.verificationEvidence, 'Ran typecheck, build, lint, focused tests, and full validation before completion.')
  write(paths.reviewEvidence, 'Reviewed the diff, changed files, acceptance checks, and Codex verdict routing boundary.')
  write(paths.qualityGates, JSON.stringify({
    gates: {
      test: { enabled: true, command: 'npm test', blocking: true, description: 'tests' },
      lint: { enabled: true, command: 'npm run lint', blocking: true, description: 'lint' },
      typecheck: { enabled: true, command: 'npm run typecheck', blocking: true, description: 'types' },
      coverage: { enabled: false, command: 'npm run coverage', blocking: true, description: 'coverage' }
    }
  }, null, 2))
  write(paths.runState, stringifyAegisRunState(state({ phase: 'validating', task_id: 'T-ROUND' })))
}

function passingRunner(): FakeCommandRunner {
  const runner = new FakeCommandRunner()
  runner.preset('npm test', { exitCode: 0, stdout: 'tests pass', stderr: '' })
  runner.preset('npm run lint', { exitCode: 0, stdout: 'lint pass', stderr: '' })
  runner.preset('npm run typecheck', { exitCode: 0, stdout: 'types pass', stderr: '' })
  return runner
}

const reviewResult = (verdict: ReviewResult['verdict']): ReviewResult => ({
  schemaVersion: '1.0',
  verdict,
  confidence: 'high',
  blocking_issues: verdict === 'NEED_FIX' ? [{
    id: 'B1',
    severity: 'BLOCKING',
    issue: 'A required behavior is missing.',
    evidence: 'src/example.ts:1',
    required_fix: 'Implement the missing behavior.'
  }] : [],
  required_fixes: verdict === 'NEED_FIX' ? ['Implement the missing behavior.'] : [],
  non_blocking_suggestions: [],
  human_questions: verdict === 'NEED_HUMAN' ? [{ question: 'Which path should Aegis take?', options: ['A', 'B'] }] : [],
  next_action: verdict === 'PASS' ? 'continue_next_task' : verdict === 'NEED_FIX' ? 'fix_current_task' : 'ask_human'
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

describe('Aegis progression policy', () => {
  function progressionFixture(config = { max_auto_rounds: 5, max_repair_attempts: 2 }): {
    dir: string
  } {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-progression-'))
    const paths = getAegisRuntimePaths(dir)
    mkdirSync(paths.configDir, { recursive: true })
    write(paths.aegisConfig, JSON.stringify({
      schema_version: 1,
      product_name: 'Aegis',
      project_id: 'aegis-rewrite',
      limits: config
    }, null, 2))
    return { dir }
  }

  it('auto mode advances PASS to next-task selection until the round limit', () => {
    const { dir } = progressionFixture({ max_auto_rounds: 3, max_repair_attempts: 2 })
    try {
      const decision = applyProgressionPolicy(dir, state({
        phase: 'passed',
        mode: 'auto',
        round_count: 1,
        task_id: 'T-PASS'
      }), '2026-06-03T10:00:00Z')

      expect(decision.state.phase).toBe('ready-for-task')
      expect(decision.state.task_id).toBeNull()
      expect(decision.state.round_count).toBe(2)
      expect(decision.modeDecision).toContain('auto mode advanced')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ask mode writes a decision request after PASS instead of continuing', () => {
    const { dir } = progressionFixture()
    try {
      const decision = applyProgressionPolicy(dir, state({
        phase: 'passed',
        mode: 'ask',
        task_id: 'T-PASS'
      }), '2026-06-03T10:00:00Z')

      expect(decision.state.phase).toBe('decision-request')
      expect(decision.decisionRequest?.decision).toContain('Codex returned PASS')
      expect(decision.modeDecision).toContain('Ask mode stopped')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('allow mode still stops at the configured round limit', () => {
    const { dir } = progressionFixture({ max_auto_rounds: 2, max_repair_attempts: 2 })
    try {
      const decision = applyProgressionPolicy(dir, state({
        phase: 'passed',
        mode: 'allow',
        round_count: 1
      }), '2026-06-03T10:00:00Z')

      expect(decision.state.phase).toBe('decision-request')
      expect(decision.decisionRequest?.decision).toContain('round limit')
      expect(decision.modeDecision).toContain('Stopped at round limit')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('hard-stops repeated NEED_FIX at the repair limit', () => {
    const { dir } = progressionFixture({ max_auto_rounds: 5, max_repair_attempts: 2 })
    try {
      const decision = applyProgressionPolicy(dir, state({
        phase: 'need-fix',
        mode: 'auto',
        last_verdict: 'NEED_FIX',
        retry_count: 2
      }), '2026-06-03T10:00:00Z')

      expect(decision.state.phase).toBe('human-handoff')
      expect(decision.state.last_verdict).toBe('NEED_HUMAN')
      expect(decision.humanHandoff).toContain('repair attempts reached')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('Aegis round gate', () => {
  it('runs prerequisite gates and generates a read-only Codex prompt after they pass', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-round-pass-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      execFileSync('git', ['add', '.'], { cwd: dir })
      execFileSync('git', ['commit', '-m', 'runtime fixture'], { cwd: dir, stdio: 'ignore' })
      const paths = getAegisRuntimePaths(dir)

      const result = await runRoundGate(dir, passingRunner(), '2026-06-03T10:00:00Z')

      expect(result.verdict).toBe('PASS')
      expect(result.steps.map(step => step.name)).toEqual([
        'safety',
        'task-quality',
        'superpower-discipline',
        'local-validation',
        'codex-prompt-readiness'
      ])
      expect(readFileSync(paths.qualityReadinessReport, 'utf-8')).toContain('Verdict: PASS')
      expect(readFileSync(paths.codexReviewPrompt, 'utf-8')).toContain('external read-only adversarial reviewer')
      expect(readFileSync(paths.codexReviewPrompt, 'utf-8')).toContain('## Validation Report')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('stops before validation when task quality fails', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-round-task-fail-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      execFileSync('git', ['add', '.'], { cwd: dir })
      execFileSync('git', ['commit', '-m', 'runtime fixture'], { cwd: dir, stdio: 'ignore' })
      const paths = getAegisRuntimePaths(dir)
      write(paths.currentTask, currentTask('Broken task').replace('```bash\nnpm run typecheck\nnpm test\n```', 'No executable checks.'))

      const result = await runRoundGate(dir, new FakeCommandRunner(), '2026-06-03T10:00:00Z')

      expect(result.verdict).toBe('NEED_FIX')
      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].name).toBe('safety')
      expect(result.steps[1].name).toBe('task-quality')
      expect(result.promptPath).toBeNull()
      expect(readFileSync(paths.qualityReadinessReport, 'utf-8')).toContain('Codex prompt was not generated')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('stops when discipline evidence fails even if Superpower sources exist', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-round-discipline-fail-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      execFileSync('git', ['add', '.'], { cwd: dir })
      execFileSync('git', ['commit', '-m', 'runtime fixture'], { cwd: dir, stdio: 'ignore' })
      const paths = getAegisRuntimePaths(dir)
      write(paths.planningEvidence, 'TODO fill this planning evidence later.')

      const result = await runRoundGate(dir, new FakeCommandRunner(), '2026-06-03T10:00:00Z')

      expect(result.verdict).toBe('NEED_FIX')
      expect(result.steps.map(step => step.name)).toEqual(['safety', 'task-quality', 'superpower-discipline'])
      expect(readFileSync(paths.disciplineReport, 'utf-8')).toContain('INSUFFICIENT: Planning evidence')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('stops when local validation has a blocking failure', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-round-validation-fail-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      execFileSync('git', ['add', '.'], { cwd: dir })
      execFileSync('git', ['commit', '-m', 'runtime fixture'], { cwd: dir, stdio: 'ignore' })
      const runner = passingRunner()
      runner.preset('npm run lint', { exitCode: 1, stdout: '', stderr: 'lint failed' })

      const result = await runRoundGate(dir, runner, '2026-06-03T10:00:00Z')

      expect(result.verdict).toBe('NEED_FIX')
      expect(result.steps.map(step => step.name)).toEqual(['safety', 'task-quality', 'superpower-discipline', 'local-validation'])
      expect(result.steps[3].detail).toContain('lint')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('Aegis safety boundaries', () => {
  it('detects forbidden actions but ignores explicit prohibitions', () => {
    const findings = detectForbiddenActions([
      'Do not run git commit from Aegis.',
      'Claude Code should run git push after tests.',
      'Aegis must not deploy to production.',
      'Run npm publish after packaging.'
    ].join('\n'), 'current-task.md')

    expect(findings.map(finding => finding.code)).toEqual([
      'FORBIDDEN_GIT_PUSH',
      'FORBIDDEN_NPM_PUBLISH'
    ])
  })

  it('hard-blocks file-scope violations and writes human handoff', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-safety-scope-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      const paths = getAegisRuntimePaths(dir)
      write(resolve(dir, 'outside.txt'), 'outside scope')

      const result = runSafetyCheck(dir, '2026-06-03T10:00:00Z')
      const stateAfter = parseAegisRunStateJson(readFileSync(paths.runState, 'utf-8'))

      expect(result.verdict).toBe('HARD_BLOCK')
      expect(result.outOfScopeFiles).toContain('outside.txt')
      expect(stateAfter.phase).toBe('hard-blocked')
      expect(readFileSync(paths.humanHandoff, 'utf-8')).toContain('hard safety boundary')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('hard-blocks forbidden commands in work instructions before construction continues', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-safety-forbidden-'))
    try {
      initGitRepo(dir)
      writeRoundFixture(dir)
      const paths = getAegisRuntimePaths(dir)
      write(paths.workInstruction, '# Work Instruction\n\nRun git reset --hard to clean up.')

      const result = runSafetyCheck(dir, '2026-06-03T10:00:00Z')

      expect(result.verdict).toBe('HARD_BLOCK')
      expect(result.findings.map(finding => finding.code)).toContain('FORBIDDEN_GIT_RESET_HARD')
      expect(readFileSync(paths.safetyReport, 'utf-8')).toContain('FORBIDDEN_GIT_RESET_HARD')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('renders commit suggestions only after Codex PASS', () => {
    const passed = state({ phase: 'passed', last_verdict: 'PASS' })
    const summary = '# Round Summary\n\nCodex returned `PASS` for the current task.'

    expect(renderCommitSuggestion(passed, summary)).toContain('## Suggested Commit Message')
    expect(() => renderCommitSuggestion(state({ phase: 'need-fix', last_verdict: 'NEED_FIX' }), summary))
      .toThrow('only after Codex PASS')
  })
})

describe('Aegis Codex verdict routing', () => {
  it('routes PASS, NEED_FIX, and NEED_HUMAN into distinct runtime states', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'aegis-routing-'))
    try {
      const paths = getAegisRuntimePaths(dir)
      mkdirSync(paths.currentDir, { recursive: true })
      mkdirSync(paths.stateDir, { recursive: true })

      write(paths.runState, stringifyAegisRunState(state({ phase: 'codex-review', task_id: 'T-ROUTE', retry_count: 1 })))
      expect(routeCodexReviewResult(dir, reviewResult('PASS'), '2026-06-03T10:00:00Z').state.phase).toBe('passed')
      expect(readFileSync(paths.roundSummary, 'utf-8')).toContain('Codex returned `PASS`')

      write(paths.runState, stringifyAegisRunState(state({ phase: 'codex-review', task_id: 'T-ROUTE', retry_count: 1 })))
      expect(routeCodexReviewResult(dir, reviewResult('NEED_FIX'), '2026-06-03T10:00:00Z').state.phase).toBe('need-fix')
      expect(readFileSync(paths.workInstruction, 'utf-8')).toContain('Repair the current task based on Codex review.')

      write(paths.runState, stringifyAegisRunState(state({ phase: 'codex-review', task_id: 'T-ROUTE', retry_count: 1 })))
      expect(routeCodexReviewResult(dir, reviewResult('NEED_HUMAN'), '2026-06-03T10:00:00Z').state.phase).toBe('human-handoff')
      expect(readFileSync(paths.humanHandoff, 'utf-8')).toContain('Codex returned `NEED_HUMAN`')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
