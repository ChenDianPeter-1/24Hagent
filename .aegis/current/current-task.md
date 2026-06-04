# Current Task

## Task ID

`20260604-pure-aegis-runtime-cleanup`

## Title

Remove old 24Hagent `.agent` runtime fallback.

## Specification

Finish the pure Aegis runtime cleanup after the user removed the ignored `.agent/` directory.

This phase must:

- remove source-level `.agent` fallback behavior
- remove tests that assert legacy `.agent` fallback is supported
- keep tests that prove new starter/setup flows do not create `.agent`
- replace compatibility docs with legacy-removal docs
- update README/HANDOFF references
- rebuild the starter bundle so it no longer ships `.agent` fallback code
- keep `.gitignore` free of old `.agent/` runtime ignores

Historical fixtures may still mention `.agent` only as old test data or negative assertions.

Human confirmation: explicit human confirmation was given. The user explicitly
deleted `.agent/`, edited `.gitignore`, and asked Codex to continue the cleanup
toward a pure complete Aegis delivery.

## File Scope

- .aegis
- .gitignore
- README.md
- docs
- src/cli
- src/core
- tests
- 24hagent-starter/bin/aegis.mjs

## Definition of DoD

- [x] physical `.agent/` directory is absent from the worktree.
- [x] active source code no longer imports or defines legacy `.agent` fallback paths.
- [x] compatibility docs are replaced with legacy-removal docs.
- [x] starter bundle is rebuilt from source.
- [x] verification passes.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run build:starter
npm run lint
npm test
rg -n "legacy-agent|getLegacyAgentRuntimePaths|LEGACY_AGENT_DIR|AEGIS_LEGACY_COMPATIBILITY" src tests docs README.md 24hagent-starter\bin\aegis.mjs
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop before removing the `24h` CLI alias, renaming `24hagent-starter/`, changing dependencies, changing release/publish/deploy behavior, pushing, or touching files outside the File Scope above. This task has explicit human confirmation for the `.gitignore` change, limited to removing old `.agent/` ignore residue.
