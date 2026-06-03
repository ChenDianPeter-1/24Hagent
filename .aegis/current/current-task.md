# Current Task

## Task ID

`20260603-post-verdict-continuation`

## Title

Continue Aegis after Codex verdict routing.

## Specification

Extend the default `aegis` controller so Codex verdict routing does not become a dead end.

The behavior must preserve the Aegis role split:

- Aegis must not repair code by itself.
- Aegis must not launch Claude Code.
- Aegis should write deterministic navigation state and instructions for Claude Code to follow.

Required continuation behavior:

- When run-state is `need-fix`, default `aegis` advances to `waiting-for-construction` and preserves the bounded Codex repair instruction already written by `review:render`.
- When run-state is `passed`, default `aegis` advances to `ready-for-task`, clears the current task id, and asks for the next concrete task.
- Normal status, work instruction, and project progress refresh should continue to work for other phases.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- src/cli/aegis.ts
- tests/cli-smoke.test.ts

## Definition of DoD

- [ ] Default `aegis` turns `need-fix` into `waiting-for-construction`.
- [ ] Default `aegis` preserves bounded Codex repair instructions when entering construction.
- [ ] Default `aegis` turns `passed` into `ready-for-task`.
- [ ] CLI smoke tests cover both continuation paths.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/cli-smoke.test.ts tests/aegis-controller.test.ts
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
