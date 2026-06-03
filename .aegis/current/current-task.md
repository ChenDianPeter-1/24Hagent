# Current Task

## Task ID

`20260603-blueprint-flow`

## Title

Add the Aegis blueprint flow.

## Specification

Implement the Aegis side of the Superpower blueprint handshake.

This phase must make blueprint drafting, summarizing, and confirmation explicit in the runtime:

- `aegis blueprint:start` prepares `.aegis/blueprint/project-blueprint.draft.md` and tells Claude Code to use Superpower discipline
- `aegis blueprint:summary` renders `.aegis/blueprint/blueprint-summary.md` and `.aegis/current/decision-request.md`
- `aegis blueprint:confirm` promotes the draft into `.aegis/blueprint/project-blueprint.md`

Aegis must not directly call Superpower. It writes state, files, and instructions; Claude Code performs the Superpower-guided drafting work and asks the human for confirmation.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- docs
- src
- tests

## Definition of DoD

- [ ] Runtime paths include blueprint draft and summary files.
- [ ] `aegis blueprint:start` prepares a draft and enters `blueprint-draft`.
- [ ] `aegis blueprint:summary` writes a summary plus decision request and enters `decision-request`.
- [ ] `aegis blueprint:confirm` confirms the draft and enters `ready-for-task`.
- [ ] Tests cover renderer behavior and CLI flow.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/cli-smoke.test.ts tests/aegis-runtime.test.ts
node dist\cli\main.js blueprint:start
node dist\cli\main.js blueprint:summary
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
