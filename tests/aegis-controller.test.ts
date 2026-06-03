import { describe, expect, it } from 'vitest'
import { decideAegisNextAction, type AegisRuntimeArtifacts } from '../src/core/aegis-runtime/index.js'
import type { AegisRunState } from '../src/core/aegis-runtime/index.js'

const state = (overrides: Partial<AegisRunState> = {}): AegisRunState => ({
  schema_version: 1,
  project_id: 'aegis-rewrite',
  task_id: 'T-001',
  phase: 'task-ready',
  mode: 'auto',
  last_verdict: null,
  retry_count: 0,
  updated_at: '2026-06-03T01:40:00+08:00',
  ...overrides
})

const artifacts = (overrides: Partial<AegisRuntimeArtifacts> = {}): AegisRuntimeArtifacts => ({
  hasCurrentTask: true,
  hasTaskQualityReport: false,
  hasQualityReadinessReport: false,
  hasValidationReport: false,
  hasSuperpowerSources: false,
  hasDisciplineReport: false,
  hasPassingDisciplineReport: false,
  hasCodexReviewPrompt: false,
  hasCodexReviewRaw: false,
  hasCodexReview: false,
  ...overrides
})

describe('Aegis controller decision', () => {
  it('routes task-ready to task review first', () => {
    const decision = decideAegisNextAction(state({ phase: 'task-ready' }), artifacts())

    expect(decision.nextAction).toContain('aegis task:review')
    expect(decision.risks).toEqual([])
  })

  it('routes task-ready to readiness after task quality report exists', () => {
    const decision = decideAegisNextAction(
      state({ phase: 'task-ready' }),
      artifacts({ hasTaskQualityReport: true })
    )

    expect(decision.nextAction).toContain('aegis readiness')
  })

  it('routes validating through readiness and validation evidence', () => {
    expect(decideAegisNextAction(state({ phase: 'validating' }), artifacts()).nextAction)
      .toContain('aegis readiness')
    expect(decideAegisNextAction(
      state({ phase: 'validating' }),
      artifacts({ hasQualityReadinessReport: true })
    ).nextAction).toContain('aegis validate')
  })

  it('routes codex-review through prompt, raw output, and render steps', () => {
    expect(decideAegisNextAction(state({ phase: 'codex-review' }), artifacts()).nextAction)
      .toContain('aegis review:prompt')
    expect(decideAegisNextAction(
      state({ phase: 'codex-review' }),
      artifacts({ hasCodexReviewPrompt: true })
    ).nextAction).toContain('save raw output')
    expect(decideAegisNextAction(
      state({ phase: 'codex-review' }),
      artifacts({ hasCodexReviewPrompt: true, hasCodexReviewRaw: true })
    ).nextAction).toContain('aegis review:render')
  })

  it('routes discipline-check through source scan and discipline report', () => {
    expect(decideAegisNextAction(state({ phase: 'discipline-check' }), artifacts()).nextAction)
      .toContain('aegis superpower:scan')
    expect(decideAegisNextAction(
      state({ phase: 'discipline-check' }),
      artifacts({ hasSuperpowerSources: true })
    ).nextAction).toContain('aegis discipline:check')
    expect(decideAegisNextAction(
      state({ phase: 'discipline-check' }),
      artifacts({ hasSuperpowerSources: true, hasDisciplineReport: true })
    ).nextAction).toContain('Repair missing current-round discipline evidence')
    expect(decideAegisNextAction(
      state({ phase: 'discipline-check' }),
      artifacts({ hasSuperpowerSources: true, hasDisciplineReport: true, hasPassingDisciplineReport: true })
    ).nextAction).toContain('Continue to Codex review')
  })

  it('blocks gate execution when current task is missing', () => {
    const decision = decideAegisNextAction(
      state({ phase: 'validating' }),
      artifacts({ hasCurrentTask: false })
    )

    expect(decision.nextAction).toContain('Create `.aegis/current/current-task.md`')
    expect(decision.risks[0]).toContain('Current task is missing')
  })
})
