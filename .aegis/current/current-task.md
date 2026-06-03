# Current Task

## Task ID

`20260603-superpower-discipline-gate`

## Title

Strengthen the Superpower Discipline Gate.

## Specification

Implement structured current-round evidence checks for the Superpower Discipline Gate.

This phase must make discipline evidence specific enough to prove Claude Code followed the expected Superpower discipline before Codex review:

- keep `superpower:scan` as a source availability check only
- make `discipline:check` inspect current-round evidence
- add requirement reasons, summaries, and failure issues for each evidence category
- reject missing, placeholder, too-short, or category-mismatched evidence
- require TDD evidence for feature rounds and debugging evidence for bug-fix rounds

Aegis records and gates evidence. Claude Code performs the construction and writes the evidence files for the active round.

## File Scope

- .aegis/current/current-task.md
- .aegis/current/*evidence.md
- docs
- src/core/superpower
- src/cli/superpower.ts
- tests/superpower-*.test.ts

## Definition of DoD

- [ ] Source availability remains separate from round evidence.
- [ ] Structured evidence includes status, summary, and failure issues.
- [ ] Missing or placeholder required evidence fails before Codex review.
- [ ] Category-mismatched evidence fails even when the file exists.
- [ ] Tests cover feature/TDD and bug/debugging requirements.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/superpower-sources.test.ts tests/superpower-cli.test.ts
node dist\cli\main.js superpower:scan
node dist\cli\main.js discipline:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
