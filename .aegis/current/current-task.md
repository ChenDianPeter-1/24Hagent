# Current Task

## Task ID

`20260604-shorten-claude-md`

## Title

Shorten root CLAUDE.md for Aegis hosting.

## Specification

Rewrite the root `CLAUDE.md` so Claude Code sees the Aegis hosting contract first instead of a long historical project/debugging manual.

This phase must:

- keep the Aegis / Claude Code / Codex / Superpower role split clear
- preserve bounded task packet, evidence, local checks, hard stops, failure, and report rules
- remove obsolete long-form debugging/process detail from the root instruction surface
- keep the document short enough to scan quickly
- update Aegis current state for GitHub issue #4

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- CLAUDE.md

## Definition of DoD

- [x] `CLAUDE.md` leads with the Aegis entrypoint and navigation files.
- [x] role boundaries and hard stops remain explicit.
- [x] root instruction surface is materially shorter than the previous 140-line file.
- [x] verification passes.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop before editing runtime code, dependencies, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
