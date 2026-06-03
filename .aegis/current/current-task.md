# Current Task

## Task ID

`20260603-public-docs-aegis`

## Title

Migrate public docs to Aegis.

## Specification

Rewrite public entry documentation so it teaches Aegis as the product identity.

This phase must remove the largest old-product-mind mismatch:

- top-level README teaches Aegis and `aegis` as the primary command
- handoff summarizes the current Aegis worktree and remaining migration risks
- new-project guide describes the `.aegis/` Claude Code / Superpower / Codex handshake
- legacy `24h` and `.agent` mentions appear only as compatibility or remaining-migration notes
- bundled starter migration is explicitly deferred to a later phase

Aegis must remain non-interactive and must not launch Claude Code or execute Codex.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- README.md
- docs

## Definition of DoD

- [x] README uses Aegis as the main heading and product identity.
- [x] README command table teaches `aegis` commands first.
- [x] Handoff reflects the current Aegis branch and recent commits.
- [x] New-project guide teaches `.aegis/` runtime and Claude Code hosting.
- [x] Old 24Hagent / `.agent` terms are only compatibility or remaining-migration notes in the touched public docs.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
rg -n "24Hagent|24hagent|`24h|24h |\\.agent" README.md docs/HANDOFF.md docs/HOW_TO_NEW_PROJECT.md
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
