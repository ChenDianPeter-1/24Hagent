# Current Task

## Task ID

`20260603-current-task-generation`

## Title

Add Aegis current-task generation.

## Specification

Implement Aegis current-task generation from the confirmed blueprint.

This phase must make next-task selection explicit and reviewable:

- add a renderer/generator for formal `.aegis/current/current-task.md`
- add `aegis task:next` to generate the next task from `.aegis/blueprint/project-blueprint.md`
- keep generated tasks compatible with `aegis task:review`
- require explicit human permission for high-risk file scope before construction

Aegis may render a bounded task from blueprint text, but Claude Code remains the construction worker.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- docs
- src
- tests

## Definition of DoD

- [ ] Current-task generator renders all required task sections.
- [ ] `aegis task:next` writes `.aegis/current/current-task.md` and enters `task-ready`.
- [ ] Generated tasks pass `aegis task:review`.
- [ ] High-risk file scope requires explicit human permission.
- [ ] Tests cover generator behavior and CLI flow.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/cli-smoke.test.ts tests/aegis-runtime.test.ts
node dist\cli\main.js task:next
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
