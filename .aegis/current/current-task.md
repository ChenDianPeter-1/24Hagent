# Current Task

## Task ID

`20260603-quality-codex-loop`

## Title

Harden quality gates and Codex review loop.

## Specification

Implement a single Aegis round gate that prepares the current task for Codex read-only review.

This phase must connect the existing local gates into a deterministic pre-Codex loop:

- task quality must pass before validation
- Superpower discipline evidence must pass before validation
- local quality gates must pass before Codex prompt generation
- Codex prompt generation must remain read-only and external
- parsed Codex verdicts must continue routing `PASS`, `NEED_FIX`, and `NEED_HUMAN` distinctly

Aegis packages evidence and writes reports. Claude Code remains the construction worker, and Codex remains the final semantic reviewer.

## File Scope

- .aegis/current
- .aegis/config/quality-gates.json
- .aegis/state/run-state.json
- docs
- src/core/aegis-runtime
- src/cli
- tests/aegis-runtime.test.ts

## Definition of DoD

- [ ] `round:check` runs task quality, Superpower discipline, local validation, and Codex prompt readiness in order.
- [ ] Local gate failures stop before Codex prompt generation.
- [ ] Discipline failures stop before local validation.
- [ ] Generated Codex prompt keeps Codex read-only and external.
- [ ] `PASS`, `NEED_FIX`, and `NEED_HUMAN` verdict routing remains distinct.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npx vitest run tests/aegis-runtime.test.ts
node dist\cli\main.js superpower:scan
node dist\cli\main.js discipline:check
node dist\cli\main.js round:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
