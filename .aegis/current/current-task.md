# Current Task

## Task ID

`20260603-progression-modes`

## Title

Implement Aegis progression modes.

## Specification

Implement executable Aegis progression behavior for `auto`, `allow`, and `ask` modes.

This phase must turn mode policy into runtime behavior:

- `auto` continues through safe deterministic post-verdict transitions
- `allow` is lower interruption but still stops at configured hard brakes
- `ask` stops after meaningful phase boundaries and writes `decision-request.md`
- repeated `NEED_FIX` beyond repair limits writes human handoff
- navigation files show the mode decision that caused Aegis to continue or stop

Aegis must remain non-interactive and must not launch Claude Code or execute Codex.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- docs
- src/core/aegis-runtime
- src/cli
- tests

## Definition of DoD

- [ ] `auto` advances after Codex `PASS` to next-task selection until the round limit.
- [ ] `ask` writes decision requests instead of silently continuing after meaningful phase boundaries.
- [ ] `allow` still stops at configured hard brakes.
- [ ] Repeated `NEED_FIX` at the repair limit writes human handoff.
- [ ] Status and progress navigation render mode-decision context.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/aegis-runtime.test.ts
npx vitest run tests/cli-smoke.test.ts tests/aegis-controller.test.ts tests/status.test.ts
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
