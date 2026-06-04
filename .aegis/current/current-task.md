# Current Task

## Task ID

`20260604-final-starter-shell-cleanup`

## Title

Remove final old starter and Orchestrator shell residue.

## Specification

Finish active-product package cleanup for pure Aegis delivery.

This phase must:

- rename the shipped starter directory from `24hagent-starter/` to `aegis-starter/`
- remove root and starter `CLAUDE_ORCHESTRATOR_PROTOCOL.md` / `START_ORCHESTRATOR.md`
- remove tracked starter `.agent/` residue if present
- stop starter setup scripts from copying old Orchestrator launch docs
- update active docs, tests, build scripts, and `.gitignore` to the new starter path
- rebuild the starter bundle
- keep historical docs/tests allowed to mention the old rewrite context only when clearly historical or fixture data

Human confirmation: explicit human confirmation was given for pure Aegis cleanup, including deletion of unnecessary old 24Hagent and `.agent/` residue. This task has explicit human confirmation for removing old starter and Orchestrator shell files.

## File Scope

- .aegis
- .gitignore
- docs
- scripts/build-starter.mjs
- tests
- aegis-starter

## Definition of DoD

- [x] active starter path is `aegis-starter/`.
- [x] old root and starter Orchestrator docs are removed.
- [x] starter setup scripts no longer create or copy `.agent` / Orchestrator shell files.
- [x] starter bundle is rebuilt.
- [x] verification passes.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run build:starter
npm run lint
npm test
rg -n "24hagent-starter|CLAUDE_ORCHESTRATOR|START_ORCHESTRATOR|Orchestrator|\"24h\":|Compatibility alias: 24h" package.json src docs README.md aegis-starter tests
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop before changing dependencies, changing release/publish/deploy behavior, pushing, or touching files outside the File Scope above. The starter rename and old shell deletion are explicitly human-confirmed for pure Aegis cleanup.
