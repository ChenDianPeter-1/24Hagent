# Current Task

## Task ID

`20260603-claude-code-contract`

## Title

Add the Claude Code-facing Aegis contract.

## Specification

Make the host contract for Claude Code explicit, tracked, and runnable.

This phase must turn the issue #14 boundary from an issue comment into project artifacts:

- a product-level contract document for humans and maintainers
- an Aegis runtime contract file that Claude Code can read
- a CLI command that prints the runtime contract

The contract must state that Aegis is not a Claude Code launcher, Claude Code is the construction worker, Aegis is the state controller and Codex communication layer, and Codex is the final read-only `PASS / NEED_FIX / NEED_HUMAN` reviewer.

## File Scope

- .aegis/config/claude-code-contract.md
- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- docs
- src
- tests

## Definition of DoD

- [ ] `docs/AEGIS_CLAUDE_CODE_CONTRACT.md` defines the host contract.
- [ ] `.aegis/config/claude-code-contract.md` provides the runtime contract.
- [ ] `aegis contract` prints the runtime contract.
- [ ] Tests cover the new runtime path and CLI command.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/cli-smoke.test.ts tests/aegis-runtime.test.ts
node dist\cli\main.js contract
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
