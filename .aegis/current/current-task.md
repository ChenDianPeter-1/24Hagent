# Current Task

## Task ID

`20260602-phase2-runtime-scaffold`

## Title

Introduce tracked `.aegis/` runtime scaffold.

## Goal

Create the initial Aegis runtime files that future CLI migration can target.

## File Scope

- `.aegis/config/aegis.json`
- `.aegis/config/quality-gates.json`
- `.aegis/config/codex-rubric.md`
- `.aegis/blueprint/project-blueprint.md`
- `.aegis/blueprint/project-progress.md`
- `.aegis/state/run-state.json`
- `.aegis/current/current-task.md`
- `.aegis/current/status.md`
- `.aegis/current/work-instruction.md`
- `.aegis/current/round-summary.md`

## Acceptance Checks

- `npm test`
- `git status --short --ignored`
- Confirm `.aegis/archive/` and generated review artifacts remain ignored.

## Stop Rules

- Do not migrate TypeScript runtime in this phase.
- Do not remove legacy `.agent` support in this phase.
- Do not change package command identity in this phase.
