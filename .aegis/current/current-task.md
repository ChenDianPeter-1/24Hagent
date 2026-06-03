# Current Task

## Task ID

`20260603-starter-setup-smoke`

## Title

Add starter setup smoke test.

## Specification

Add a real smoke test proving the bundled Aegis starter setup initializes `.aegis/` onboarding state in a temporary target project.

This phase must:

- run `24hagent-starter/setup.ps1` against a temporary target project
- pass `-NoClaude` and `-SkipReadiness` so no Claude launch or target validation occurs
- verify generated `.aegis/` config/current/state files
- verify `aegis-install` and Superpower skills are installed
- verify old `.agent` onboarding state is not created
- update Aegis current evidence for issue #17

Starter behavior changes are out of scope unless the smoke test exposes a real setup bug.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- tests/starter-setup-smoke.test.ts

## Definition of DoD

- [x] Smoke test runs starter setup in a temporary target project.
- [x] Smoke test verifies `.aegis/config/quality-gates.json`.
- [x] Smoke test verifies `.aegis/state/run-state.json`.
- [x] Smoke test verifies `.aegis/current/next-claude-install-prompt.md`.
- [x] Smoke test verifies `aegis-install` and Superpower skills.
- [x] Smoke test verifies old `.agent` onboarding state is absent.

## Acceptance Checks

```bash
npx vitest run tests/starter-setup-smoke.test.ts
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

Stop and ask for human confirmation before changing runtime code, starter behavior beyond a verified smoke-test bug fix, dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
