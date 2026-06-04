# Current Task

## Task ID

`20260604-final-aegis-naming-cleanup`

## Title

Remove final old command and role naming residue.

## Specification

Finish active-product naming cleanup for pure Aegis delivery.

This phase must:

- remove the old `24h` CLI alias from `package.json`
- remove CLI help text that advertises `24h`
- update active docs to say Aegis exposes only `aegis`
- replace active `Orchestrator` wording in generated gate/report text with Aegis/Claude Code wording
- rebuild the starter bundle
- keep historical docs/tests allowed to mention the old rewrite context only when clearly historical or fixture data

Human confirmation: explicit human confirmation was given for pure Aegis cleanup, including removal of old 24Hagent residue. This task has explicit human confirmation for the `package.json` bin change.

## File Scope

- .aegis
- package.json
- README.md
- docs
- src/cli/main.ts
- src/core/quality
- 24hagent-starter/README.md
- 24hagent-starter/bin/aegis.mjs

## Definition of DoD

- [x] active package bin exposes `aegis` only.
- [x] CLI help no longer advertises `24h`.
- [x] active generated gate/report text no longer says `Orchestrator`.
- [x] starter bundle is rebuilt.
- [x] verification passes.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run build:starter
npm run lint
npm test
rg -n "Compatibility alias: 24h|\"24h\":|Orchestrator" package.json src docs README.md 24hagent-starter\README.md 24hagent-starter\bin\aegis.mjs
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop before renaming `24hagent-starter/`, changing dependencies, changing release/publish/deploy behavior, pushing, or touching files outside the File Scope above. The `package.json` bin change is explicitly human-confirmed and limited to removing the old `24h` alias.
