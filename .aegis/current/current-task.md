# Current Task

## Task ID

`20260603-docs-sync-after-starter`

## Title

Sync public docs after starter migration.

## Specification

Synchronize root public docs and Aegis current evidence after the bundled starter migration.

This phase must:

- remove stale notes that say bundled starter migration is still pending
- describe `24hagent-starter/` as an Aegis-first starter with a compatibility folder name
- reframe remaining starter work as smoke testing and legacy fallback audit
- update Aegis current evidence for issue #16

No runtime or starter behavior changes are in scope.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- README.md
- docs/HANDOFF.md
- docs/HOW_TO_NEW_PROJECT.md

## Definition of DoD

- [x] README says bundled starter onboarding has migrated to Aegis.
- [x] Handoff lists the starter migration commit and removes starter migration from pending high-value work.
- [x] New-project guide describes how the migrated starter initializes `.aegis/`.
- [x] Remaining work is framed as starter smoke testing, compatibility fallback audit, or Python docs migration.

## Acceptance Checks

```bash
rg -n "starter.*legacy|legacy starter|still being migrated|should be rewritten as an Aegis starter|Migrate bundled starter" README.md docs/HANDOFF.md docs/HOW_TO_NEW_PROJECT.md
rg -n "24Hagent|24hagent|\\.agent|24h" README.md docs/HANDOFF.md docs/HOW_TO_NEW_PROJECT.md
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing runtime code, starter behavior, dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
