# Aegis Legacy Compatibility Audit

Tracking issue: GitHub issue `#19`.

## Decision

Aegis is `.aegis/`-first. New projects, starter onboarding, public docs, task
packets, generated navigation files, review packets, and quality reports should
teach `.aegis/`.

The old `.agent/` runtime is retained only as a compatibility fallback for
projects created before the Aegis migration. It is not an onboarding path and
should not be copied into new projects.

## Retained Compatibility Surface

The remaining legacy runtime paths are centralized in
`src/core/aegis-runtime/legacy-compat.ts`.

They are used only when the primary `.aegis/` runtime marker for a command is
absent:

| Command area | Aegis marker | Legacy fallback |
|---|---|---|
| readiness | `.aegis/config/quality-gates.json` | `.agent/QUALITY_GATES.json` |
| validation | `.aegis/config/quality-gates.json` | `.agent/QUALITY_GATES.json` |
| task review | `.aegis/current/current-task.md` | `.agent/CURRENT_TASK.md` |
| review prompt/render | `.aegis/current/current-task.md` | `.agent/CURRENT_TASK.md` |
| status | `.aegis/state/run-state.json` | `.agent/RUN_STATE.json` |
| evidence builder | `.aegis/current/current-task.md` | `.agent/CURRENT_TASK.md` |

## Test Coverage

The compatibility behavior is intentionally covered by tests:

- `tests/readiness-cli.test.ts`
- `tests/validate-cli.test.ts`
- `tests/task-review-cli.test.ts`
- `tests/review-cli.test.ts`
- `tests/evidence-builder.test.ts`
- `tests/status.test.ts`
- `tests/starter-setup-smoke.test.ts`

The starter smoke test proves new onboarding creates `.aegis/` and does not
create `.agent/`.

## Current Non-Goals

- Do not remove the `24h` CLI alias without a dedicated compatibility-release
  decision.
- Do not rename the distributed `24hagent-starter/` folder in this phase. The
  folder name is still a packaging compatibility shell; its installed runtime is
  Aegis-first.
- Do not remove `.agent/` fallback code until a dedicated migration phase either
  provides an upgrader or explicitly drops support for old projects.
