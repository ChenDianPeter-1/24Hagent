# Aegis Handoff

Updated: 2026-06-03

## Current State

Worktree:

- Path: `D:\AAAOddsAndEnds\PROGRAM\aegis`
- Branch: `aegis-repositioning`
- Tracking issue: GitHub issue `#14` in `ChenDianPeter-1/24Hagent`

Product position:

```text
Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
```

Aegis is a non-interactive state controller and delivery gate hosted by Claude Code. Claude Code constructs. Codex reviews read-only. Aegis packages evidence, runs gates, routes verdicts, and stops at safety boundaries.

## Recent Commits

- `bb89797 feat: archive completed Aegis rounds`
- `c100cd2 feat: add Aegis progression modes`
- `880a6fd feat: enforce Aegis safety boundaries`
- `34c1902 feat: add Aegis round review gate`
- `722d63d feat: strengthen Superpower discipline gate`

## Implemented Runtime

Current Aegis runtime surface:

- `.aegis/config/aegis.json`
- `.aegis/config/quality-gates.json`
- `.aegis/config/codex-rubric.md`
- `.aegis/config/claude-code-contract.md`
- `.aegis/blueprint/project-blueprint.md`
- `.aegis/blueprint/project-progress.md`
- `.aegis/current/current-task.md`
- `.aegis/current/status.md`
- `.aegis/current/work-instruction.md`
- `.aegis/current/*-evidence.md`
- `.aegis/state/run-state.json`
- `.aegis/archive/<task-id>/`

Core commands:

```bash
aegis
aegis contract
aegis task:next
aegis task:review
aegis superpower:scan
aegis discipline:check
aegis round:check
aegis review:prompt
aegis review:render
aegis safety:check
aegis commit:suggest
```

`24h` exists only as a compatibility alias. New work should use `aegis`.

## Verification Baseline

Recent completed phases passed:

- `npm run typecheck`
- `npm run build`
- `npm run lint`
- `npm test`
- `node dist\cli\main.js safety:check`
- `node dist\cli\main.js task:review`
- `git diff --check`

Known strict-gate behavior:

- `aegis round:check` can return `NEED_FIX` because configured coverage thresholds are still 100% and measured coverage is below that bar.
- This is a real local quality-gate failure, not a parser/config false positive.

## Remaining High-Value Work

Do not mark the rewrite complete until these are audited or implemented:

- Migrate bundled starter from 24Hagent / `.agent` to Aegis / `.aegis`.
- Decide whether legacy Python quickstart/test docs should be rewritten or archived as historical material.
- Strengthen blueprint revision behavior beyond the current start/summary/confirm slice.
- Audit README/docs/package/starter search results for old product mind before final completion.

## Boundaries

Aegis must not:

- launch Claude Code
- execute Codex
- commit or push
- merge, rebase, reset, or rewrite Git history
- publish, release, deploy, or Docker push
- hide user decisions inside terminal prompts

When a human decision is needed, Aegis writes `decision-request.md` or `human-handoff.md`; Claude Code asks the user.
