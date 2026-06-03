# Current Task

## Task ID

`20260603-discipline-evidence-boundary`

## Title

Make discipline check require current-round evidence.

## Specification

Incorporate the latest issue #14 guidance into Aegis.

The implementation must make three boundaries explicit:

- Aegis is not a Claude Code launcher. It is a non-interactive state controller and delivery gate used from inside an active Claude Code session.
- Codex is the independent read-only reviewer that returns the final semantic `PASS`, `NEED_FIX`, or `NEED_HUMAN` verdict for a completed construction round. Aegis packages evidence and routes the Codex verdict.
- `discipline:check` must verify current-round discipline evidence, not merely Superpower source availability.

Implement a first file-based discipline evidence gate that reads `.aegis/current/*-evidence.md`, fails when required evidence is missing, and blocks continuation before Codex review.

## File Scope

- .aegis/current
- .aegis/blueprint/project-progress.md
- .aegis/state/run-state.json
- docs
- src/cli
- src/core/aegis-runtime
- src/core/superpower
- tests

## Definition of DoD

- [ ] `discipline:check` fails when Superpower sources exist but current-round evidence is missing.
- [ ] `discipline:check` passes when required planning, TDD, verification, and review evidence exists for this feature-style round.
- [ ] The default Aegis controller does not continue to Codex review unless `discipline-report.md` contains `Verdict: PASS`.
- [ ] Product docs state that Aegis is not a Claude Code launcher and Codex owns the final three-state review verdict.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist\cli\main.js task:review
node dist\cli\main.js superpower:scan
node dist\cli\main.js discipline:check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
