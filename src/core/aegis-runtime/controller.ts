import type { AegisRunState } from './run-state.js'

export type AegisRuntimeArtifacts = {
  hasCurrentTask: boolean
  hasTaskQualityReport: boolean
  hasQualityReadinessReport: boolean
  hasValidationReport: boolean
  hasCodexReviewPrompt: boolean
  hasCodexReviewRaw: boolean
  hasCodexReview: boolean
}

export type AegisControllerDecision = {
  nextAction: string
  risks: string[]
}

export function decideAegisNextAction(
  state: AegisRunState,
  artifacts: AegisRuntimeArtifacts
): AegisControllerDecision {
  const risks: string[] = []

  if (!artifacts.hasCurrentTask && [
    'task-ready',
    'waiting-for-construction',
    'validating',
    'discipline-check',
    'codex-review',
    'need-fix'
  ].includes(state.phase)) {
    risks.push('Current task is missing; Aegis cannot safely continue gate execution.')
    return {
      nextAction: 'Create `.aegis/current/current-task.md` or enter `decision-request` before allowing construction.',
      risks
    }
  }

  switch (state.phase) {
    case 'uninitialized':
      return {
        nextAction: 'Create `.aegis/` runtime scaffold and draft the project blueprint.',
        risks
      }
    case 'blueprint-draft':
    case 'blueprint-revision':
      return {
        nextAction: 'Claude Code should refine `.aegis/blueprint/project-blueprint.md` before task execution.',
        risks
      }
    case 'blueprint-confirmation':
      return {
        nextAction: 'Claude Code should ask the user to confirm the blueprint.',
        risks
      }
    case 'ready-for-task':
      return {
        nextAction: 'Write a concrete `.aegis/current/current-task.md` before construction begins.',
        risks
      }
    case 'task-ready':
      return {
        nextAction: artifacts.hasTaskQualityReport
          ? 'Task quality report exists. Run `aegis readiness` next.'
          : 'Run `aegis task:review` to check the current task before construction.',
        risks
      }
    case 'waiting-for-construction':
      return {
        nextAction: 'Claude Code should read `.aegis/current/work-instruction.md`, perform the scoped work, and leave evidence.',
        risks
      }
    case 'validating':
      if (!artifacts.hasQualityReadinessReport) {
        return { nextAction: 'Run `aegis readiness` to verify local toolchain readiness.', risks }
      }
      if (!artifacts.hasValidationReport) {
        return { nextAction: 'Run `aegis validate` to execute configured quality gates.', risks }
      }
      return { nextAction: 'Validation evidence exists. Continue to Superpower discipline check.', risks }
    case 'discipline-check':
      return {
        nextAction: 'Record Superpower discipline evidence, then continue to Codex review.',
        risks
      }
    case 'codex-review':
      if (!artifacts.hasCodexReviewPrompt) {
        return { nextAction: 'Run `aegis review:prompt` to generate the Codex review prompt.', risks }
      }
      if (!artifacts.hasCodexReviewRaw) {
        return { nextAction: 'Ask Codex for read-only review and save raw output to `.aegis/current/codex-review.jsonl`.', risks }
      }
      if (!artifacts.hasCodexReview) {
        return { nextAction: 'Run `aegis review:render` to render the Codex decision.', risks }
      }
      return { nextAction: 'Codex review is rendered. Route PASS / NEED_FIX / NEED_HUMAN.', risks }
    case 'need-fix':
      return {
        nextAction: 'Claude Code should repair only the required fixes inside current task scope, then rerun gates.',
        risks
      }
    case 'passed':
      return {
        nextAction: 'Archive the round, update project progress, and prepare the next task.',
        risks
      }
    case 'paused':
      return {
        nextAction: 'Run `aegis` to refresh status, or update run-state phase to resume the next gate.',
        risks
      }
    case 'blocked':
    case 'hard-blocked':
      return {
        nextAction: 'Stop. Claude Code should surface the blocker to the user before continuing.',
        risks
      }
    case 'decision-request':
      return {
        nextAction: 'Claude Code should ask the user using `.aegis/current/decision-request.md`.',
        risks
      }
    case 'human-handoff':
      return {
        nextAction: 'Stop and give the user `.aegis/current/human-handoff.md`.',
        risks
      }
    case 'archived':
      return {
        nextAction: 'Round is archived. Prepare or select the next task.',
        risks
      }
  }
}
