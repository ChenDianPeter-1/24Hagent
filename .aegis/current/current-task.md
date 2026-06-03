# Current Task

## Task ID

`20260603-python-docs-aegis`

## Title

Migrate Python onboarding docs to Aegis.

## Specification

Rewrite stale Python onboarding docs so they teach Aegis / `.aegis` instead of the old 24Hagent / `.agent` loop.

This phase must:

- rewrite Python quickstart around Aegis starter, `.aegis`, and `aegis`
- rewrite Python validation plan around Aegis runtime paths
- mark the old Python adaptation analysis as historical context
- remove current onboarding instructions that tell users to initialize old runtime state
- update Aegis current evidence for issue #18

Runtime code changes are out of scope unless docs migration reveals a real verified bug.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- docs/PYTHON_QUICKSTART.md
- docs/PYTHON_TEST_PLAN.md
- docs/PYTHON_ADAPTATION_ANALYSIS.md

## Definition of DoD

- [x] Python quickstart teaches Aegis starter and `.aegis`.
- [x] Python test plan uses `.aegis/current` report paths.
- [x] Python adaptation analysis is marked historical.
- [x] Current Python docs do not instruct users to initialize old runtime state.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
rg -n "初始化 \\.agent|mkdir -p \\.agent|\\.agent/PROJECT_BLUEPRINT|\\.agent/QUALITY_GATES|启动 Orchestrator|24hagent 启动 Python|24h readiness|node dist/cli/main.js readiness" docs/PYTHON_QUICKSTART.md docs/PYTHON_TEST_PLAN.md docs/PYTHON_ADAPTATION_ANALYSIS.md
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing runtime code, starter behavior, dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
