# Aegis Claude Code Hosting Protocol

This file explains how Claude Code should host Aegis.

Aegis is not another coding agent. Claude Code constructs. Aegis owns state,
task slicing, evidence expectations, local gates, Codex review packets, verdict
routing, and safety boundaries.

## Core Loop

```text
human asks Claude Code to use Aegis
Claude Code runs aegis
Aegis refreshes .aegis/current navigation
Claude Code reads the next instruction
Claude Code performs only the bounded work
Claude Code leaves evidence
Aegis runs gates and prepares Codex review
Codex reviews read-only
Aegis routes PASS / NEED_FIX / NEED_HUMAN
```

## Runtime Files

```text
.aegis/config/aegis.json
.aegis/config/quality-gates.json
.aegis/config/codex-rubric.md
.aegis/config/claude-code-contract.md
.aegis/blueprint/project-blueprint.md
.aegis/blueprint/project-progress.md
.aegis/current/current-task.md
.aegis/current/status.md
.aegis/current/work-instruction.md
.aegis/current/decision-request.md
.aegis/current/human-handoff.md
.aegis/current/round-summary.md
.aegis/current/*-evidence.md
.aegis/state/run-state.json
.aegis/archive/<task-id>/
```

## Claude Code Duties

- Read `.aegis/current/status.md` and `.aegis/current/work-instruction.md`.
- Stay inside the file scope from `.aegis/current/current-task.md`.
- Use Superpower for planning, TDD, debugging, review, and finish discipline.
- Leave current-round evidence before asking Aegis to proceed.
- Run only the commands Aegis or the task explicitly asks for.
- Stop when Aegis writes `decision-request.md` or `human-handoff.md`.

## Aegis Duties

- Generate or refresh navigation files.
- Check task quality before construction.
- Check Superpower discipline evidence.
- Run local validation gates.
- Generate Codex read-only review prompts.
- Render Codex results into `PASS`, `NEED_FIX`, or `NEED_HUMAN`.
- Archive completed rounds.
- Render commit suggestions only after Codex `PASS`.

## Boundaries

Aegis must not:

- launch Claude Code
- execute Codex
- write product code
- commit, push, merge, rebase, reset, or rewrite Git history
- deploy, release, publish, or Docker push
- hide human decisions inside terminal prompts

Claude Code must not treat its own work as finally approved. Codex remains the
read-only semantic reviewer, and the human controls Git and release actions.
