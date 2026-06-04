# Current Task

## Task ID

`20260604-legacy-agent-compat-audit`

## Title

Audit and centralize legacy `.agent` compatibility.

## Specification

Audit the remaining legacy `.agent` runtime surface after the Aegis migration and make the compatibility boundary explicit.

This phase must:

- inventory remaining `.agent` and old-product references in source, tests, docs, and starter artifacts
- centralize retained `.agent` fallback paths behind a compatibility-only module
- document why `.agent` support remains and what must not teach it as a new onboarding path
- update public status docs so completed starter/Python work is not listed as remaining
- keep legacy behavior covered by existing tests

Removing `.agent` support, renaming `24hagent-starter/`, and removing the `24h` alias are out of scope for this phase.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- README.md
- 24hagent-starter/bin/aegis.mjs
- docs
- src/cli
- src/core/aegis-runtime
- src/core/review/evidence-builder.ts

## Definition of DoD

- [x] `.agent` fallback paths are inventoried.
- [x] retained fallback paths are centralized behind a compatibility-only module.
- [x] docs explain `.agent` is not the new onboarding path.
- [x] starter bundle is rebuilt from the updated source.
- [x] full verification passes.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run build:starter
npm run lint
npm test
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!coverage/**' --glob '!.git/**' '\.agent'
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before deleting `.agent` compatibility, renaming distribution folders, removing compatibility aliases, changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
