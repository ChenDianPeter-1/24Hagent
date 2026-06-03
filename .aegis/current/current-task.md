# Current Task

## Task ID

`20260603-safety-boundaries`

## Title

Enforce Aegis safety boundaries.

## Specification

Implement executable Aegis safety boundaries for forbidden actions, file scope, hard blocks, and commit suggestions.

This phase must turn safety policy into runtime behavior:

- detect forbidden Git, publish, release, deploy, and history rewrite actions in current task and work instructions
- report dirty worktree state and file-scope violations
- hard-block unsafe rounds and write human handoff
- add `aegis safety:check`
- add PASS-only commit suggestion rendering without executing `git commit`

Human confirmed high-risk scope for `.gitignore` safety artifact policy in this A10 task. Aegis still must not execute forbidden actions.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- .gitignore
- docs
- src/core/aegis-runtime
- src/cli
- tests/aegis-runtime.test.ts

## Definition of DoD

- [ ] Safety gate detects forbidden actions and ignores explicit prohibition statements.
- [ ] Safety gate reports dirty worktree and file-scope violations.
- [ ] Hard safety failures route to `hard-blocked` and write human handoff.
- [ ] `round:check` runs safety before other gates.
- [ ] Commit suggestion rendering is available only after Codex `PASS`.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/aegis-runtime.test.ts
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
