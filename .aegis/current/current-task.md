# Current Task

## Task ID

`20260603-round-archive`

## Title

Archive completed Aegis rounds.

## Specification

Implement executable round archival behavior after Codex `PASS`.

This phase must turn the documented `PASS -> archive round` contract into runtime behavior:

- copy completed round artifacts into `.aegis/archive/<task-id>/`
- write a small archive manifest
- archive before next-task selection or ask-mode decision request
- tolerate missing optional reports/artifacts
- avoid duplicate confusing archive names on repeated writes

Aegis must remain non-interactive and must not launch Claude Code or execute Codex.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- docs
- src/core/aegis-runtime
- src/cli
- tests

## Definition of DoD

- [ ] Completed rounds archive current task, summary, evidence, reports, and Codex artifacts when present.
- [ ] Archive manifest records task id, timestamp, and copied files.
- [ ] `auto` PASS progression archives before next-task selection.
- [ ] `ask` PASS progression archives before writing decision request.
- [ ] Archive behavior does not execute Git or publish/release actions.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/aegis-runtime.test.ts
npx vitest run tests/cli-smoke.test.ts tests/aegis-runtime.test.ts
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
