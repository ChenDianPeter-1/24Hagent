# Current Task

## Task ID

`20260603-navigation-refresh`

## Title

Add automatic Aegis navigation rendering.

## Specification

Implement automatic navigation file rendering and stale derived-file recovery.

This phase must make Aegis navigation files deterministic and centrally refreshed:

- add a reusable navigation refresh service
- make default `aegis` recover stale `status.md`, `work-instruction.md`, and `project-progress.md`
- render `decision-request.md` when the phase needs human input
- preserve bounded Codex repair instructions when `NEED_FIX` continues into construction
- let state-moving commands reuse the same navigation refresh service

Aegis owns navigation files as derived artifacts. Claude Code reads them and performs only the instructed next step.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- docs
- src
- tests

## Definition of DoD

- [ ] Navigation refresh service writes status, work instruction, and project progress.
- [ ] Stale navigation files are regenerated from run-state and runtime context.
- [ ] Decision-request phase writes `.aegis/current/decision-request.md`.
- [ ] Bounded repair work instructions can be preserved.
- [ ] Tests cover refresh, decision request, and preserve behavior.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/cli-smoke.test.ts tests/aegis-runtime.test.ts
node dist\cli\main.js task:review
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
