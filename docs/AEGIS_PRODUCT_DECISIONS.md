# Aegis Product Decisions

Source: `D:\Desktop\ChatGPT-查看私密仓库权限.md`

This document freezes the product decisions from the 57-question Aegis discussion. If the chat transcript and the codebase disagree, this document is the Phase 1 interpretation for the rewrite.

## Final Positioning

Aegis is not another autonomous coding agent. Aegis is a delivery gate that lives inside the Claude Code workflow.

Short formula:

```text
Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
```

Aegis exists to make Claude Code delivery harder to lose control of. It does not compete with Codex goal mode on "who can finish a goal automatically." It focuses on safer handoff, smaller task slices, evidence, validation, and cross-model review.

## Product Boundaries

Aegis does:

- Turn a user goal into a governed Claude Code workflow.
- Ask Claude Code to use Superpower for brainstorming, planning, TDD, debugging, review, and finishing discipline.
- Normalize Superpower output into Aegis-owned runtime files.
- Generate one small current task at a time.
- Run local quality gates.
- Build Codex review prompts and render Codex review results.
- Route the current round based on the Codex `PASS`, `NEED_FIX`, or `NEED_HUMAN` review verdict.
- Maintain short navigation files for recovery and continuity.

Aegis does not:

- Write product code itself.
- Contain its own model.
- Directly call Superpower outside the current Claude Code session.
- Launch Claude Code or become an autonomous coding runner.
- Invent the final semantic review verdict after local checks.
- Directly ask the human in an interactive CLI.
- Automatically commit, push, merge, release, deploy, publish, or rewrite Git history.

## User Experience

The human talks to Claude Code, not to Aegis files.

The user should be able to say something like:

```text
Use Aegis to start this project. I want to build ...
```

Claude Code then uses Aegis and Superpower to produce the plan, ask the user for confirmation, perform work, and run gates. The user should not manually edit `.aegis/` files and should not need to type a command after every phase.

The product handshake is:

```text
Human inside Claude Code says "Use Aegis to start/continue"
Claude Code runs `aegis`
Aegis refreshes `.aegis/current/status.md`, `.aegis/current/work-instruction.md`, and `.aegis/blueprint/project-progress.md`
Claude Code reads those files and performs only the instructed next step
```

Aegis itself must not start Claude Code, spawn an autonomous coding loop, or hide the construction worker role.

## Superpower Role

Superpower is the engineering discipline layer, not the Aegis runtime.

Rules:

- Superpower brainstorming generates and revises the project blueprint.
- Superpower writing-plans produces implementation planning material.
- Superpower TDD, systematic debugging, code review, and finishing branch skills define expected construction discipline.
- Aegis runtime does not own the Superpower directory as runtime state.
- Aegis stores references, summaries, and extracted current-round material.

The bundled `aegis-starter/` may distribute a Superpower Pack into
`.claude/skills/superpower/` for Claude Code onboarding. That copy belongs to
the Claude Code skills surface, not to `.aegis/` runtime state.

## Blueprint Rules

The user gives a natural-language goal. Claude Code uses Superpower brainstorming to turn it into a blueprint draft.

The blueprint process:

1. User gives goal to Claude Code.
2. Claude Code uses Superpower brainstorming.
3. Aegis stores `project-blueprint.draft.md`.
4. Aegis generates a short summary and `decision-request.md`.
5. Claude Code asks the user to confirm or revise.
6. If confirmed, Aegis locks the draft as `project-blueprint.md`.
7. If rejected, Aegis enters `blueprint-revision` and Claude Code uses Superpower brainstorming to revise.

Aegis only does a light blueprint structure check. It should prevent empty or unusable blueprints, but it should not add a heavy second product-review layer on top of Superpower.

## Current Task Rules

Superpower can produce plans and task suggestions. Aegis owns the official `current-task.md`.

Rules:

- Aegis extracts the next minimal task from the Superpower plan.
- Aegis never dumps a whole plan into the current task.
- Each task must have a small file scope.
- Each task must define acceptance checks.
- Each task must define stop rules.
- Claude Code must work only inside the current task scope.

## Progression Modes

Aegis supports three progression modes:

```text
auto
allow
ask
```

`auto` is the default. Aegis decides whether to continue automatically. It stops for high-risk files, scope expansion, weak evidence, `NEED_HUMAN`, repeated failures, or release-like actions.

`allow` is a low-interruption mode. Aegis can continue after `PASS`, but it must still have hard brakes such as maximum rounds, maximum repair attempts, and high-risk stop rules.

`ask` stops after each meaningful phase and asks Claude Code to request human confirmation.

## Construction Rules

Aegis does not perform code edits. It creates a construction instruction, pauses, and lets the current Claude Code session execute the work.

When construction is needed, Aegis must:

- Write `work-instruction.md`.
- Mark the run state as waiting for Claude Code construction.
- Stop CLI execution.
- Let Claude Code perform the work.
- Continue when Claude Code or the user invokes Aegis again.

## Discipline Gate

Aegis must verify that Claude Code left evidence for the required Superpower discipline.

Examples:

- New feature work should have planning and TDD evidence.
- Bug fixing should have systematic debugging evidence.
- Completed work should have verification-before-completion and review evidence.

If the Superpower Discipline Gate fails, Aegis fails the round before Codex review.

`superpower:scan` and `discipline:check` are different gates:

- `superpower:scan` records whether the required Superpower source files exist.
- `discipline:check` verifies current-round evidence that Claude Code actually followed the required discipline.

`discipline:check` must fail when required round evidence is missing, even if every Superpower source skill exists.

The first file-based evidence contract is:

- `planning-evidence.md` for planning evidence.
- `tdd-evidence.md` for TDD or test-first evidence when feature work requires it.
- `debugging-evidence.md` for systematic debugging evidence when bug-fix work requires it.
- `verification-evidence.md` for verification-before-completion evidence.
- `review-evidence.md` for review/finishing evidence.

Missing required evidence blocks the round before Codex review.

## Codex Review Authority

Codex is the independent read-only reviewer and the only source of the final semantic review verdict for a completed construction round.

Aegis may:

- Run local prerequisite gates before Codex.
- Block before Codex if scope, quality, safety, or discipline evidence is missing.
- Build the Codex review packet.
- Parse and route the Codex result.

Aegis must not replace Codex as the semantic judge. The final construction-round review verdict comes from Codex output:

```text
PASS
NEED_FIX
NEED_HUMAN
```

Routing is deterministic:

- `PASS`: archive and summarize the round, then prepare continuation or completion.
- `NEED_FIX`: generate a bounded repair instruction for Claude Code and return to construction.
- `NEED_HUMAN`: write a human handoff packet and stop.

## Human Interaction

Aegis is a non-interactive CLI. It does not ask the user questions directly.

Aegis writes decision files. Claude Code reads them and asks the user in chat.

Decision files include:

- `decision-request.md`
- `human-handoff.md`

If `decision-request.md` exists, the main Aegis entrypoint must stop and report that user confirmation is required.

## State Rules

The machine source of truth is `run-state.json`.

Derived navigation files include:

- `status.md`
- `work-instruction.md`
- `round-summary.md`
- `project-progress.md`

Derived files are rewritten by Aegis. Humans do not edit them manually.

If derived files are stale, Aegis rewrites them. If `run-state.json` contradicts `current-task.md`, Aegis stops and enters recovery or handoff.

## Git Rules

Aegis checks the Git worktree before running.

Rules:

- No `current-task.md` plus code changes means `blocked`.
- Changes inside current task scope are allowed.
- Changes outside current task scope are `hard-blocked`.
- Aegis navigation file changes do not count as code scope violations.

Aegis may generate commit suggestions and commit message drafts. It must never perform the commit.

Forbidden actions:

- `git commit`
- `git push`
- `git merge`
- `git rebase`
- `git reset --hard`
- branch deletion
- `npm publish`
- `docker push`
- release
- deploy
- Git history rewriting

These forbidden actions are built-in product safety boundaries and cannot be disabled by normal configuration.

## Git Tracking Policy

Tracked by default:

- `.aegis/config/quality-gates.json`
- `.aegis/config/codex-rubric.md`
- `.aegis/blueprint/project-blueprint.md`
- `.aegis/blueprint/project-progress.md`
- `.aegis/state/run-state.json` if kept minimal
- Key current navigation files such as `current-task.md`, `status.md`, `work-instruction.md`, and `round-summary.md`

Not tracked by default:

- `.aegis/archive/`
- Raw Codex JSONL
- Generated Codex review prompts
- Per-run validation reports
- Long debug logs
- Temporary files

## Naming Rules

Machine paths and file names use English lowercase kebab-case.

Human-facing Markdown content can be Chinese. CLI output can be Chinese when needed, but schemas, commands, file paths, and machine interfaces stay English.

The runtime directory is `.aegis/`, not `.agent/` and not `.aiges/`.

## Implementation Direction

Core logic belongs in TypeScript and Node.js. PowerShell is only a Windows launcher or installation helper.

The formal command identity is `aegis`. Old `24h` command aliases were removed during the pure Aegis cleanup and are not part of the active product.
