# Current Task

## Task ID

`20260603-codex-verdict-routing`

## Title

Route Codex review verdicts through Aegis runtime.

## Specification

Implement the first real Aegis runtime routing step after Codex review rendering.

`aegis review:render` already parses Codex JSONL and writes `codex-review.md`. Extend the Aegis runtime path so the rendered Codex verdict is consumed as the authoritative three-state result:

- `PASS` updates `run-state.json` to `passed`, clears retry count, and writes a concise `round-summary.md`.
- `NEED_FIX` updates `run-state.json` to `need-fix`, increments retry count, and writes a bounded `work-instruction.md` for Claude Code.
- `NEED_HUMAN` updates `run-state.json` to `human-handoff` and writes `human-handoff.md`.

Legacy `.agent` review rendering must remain compatible and should not require Aegis run-state files.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- src/cli
- src/core/aegis-runtime
- tests

## Definition of DoD

- [ ] `review:render` routes `PASS` to Aegis `passed` state and writes a round summary.
- [ ] `review:render` routes `NEED_FIX` to Aegis `need-fix` state and writes bounded repair instructions.
- [ ] `review:render` routes `NEED_HUMAN` to Aegis `human-handoff` state and writes a human handoff packet.
- [ ] Existing review parsing and legacy runtime behavior remain covered by tests.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/review-cli.test.ts tests/review-result.test.ts tests/result-renderer.test.ts
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
