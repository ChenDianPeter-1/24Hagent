# Current Task

## Task ID

`20260603-phase9-current-task-normalization`

## Title

Normalize tracked Aegis current task scaffold.

## Specification

Rewrite the tracked `.aegis/current/current-task.md` scaffold into the canonical task package schema now used by `task:review`.

The task package must be concrete enough for Aegis to review itself:

- include a non-empty Specification section
- include a narrow File Scope
- include at least two independently checkable Definition of DoD items
- include executable Acceptance Checks
- include a clear Stop Rule

Synchronize the tracked runtime navigation files so `status`, `work-instruction`, `project-progress`, and `run-state.json` no longer point at the completed Phase 2 scaffold task.

## File Scope

- `.aegis/blueprint/project-progress.md`
- `.aegis/state/run-state.json`
- `.aegis/current/current-task.md`
- `.aegis/current/status.md`
- `.aegis/current/work-instruction.md`
- `.aegis/current/round-summary.md`

## Definition of DoD

- [ ] `aegis task:review` reads the tracked `.aegis/current/current-task.md` and returns `PASS`.
- [ ] Runtime navigation files reference `20260603-phase9-current-task-normalization` instead of the completed Phase 2 scaffold task.
- [ ] Generated task quality reports remain ignored runtime artifacts.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing product code, dependency files, GitHub configuration, release/publish/deploy behavior, or files outside the File Scope above.
