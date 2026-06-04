---
name: aegis-install
description: Use when Aegis Starter has completed local setup and Claude Code must onboard a project into Aegis using the bundled Superpower Pack before creating minimal .aegis runtime state.
---

# Aegis Install Onboarding

You are in a project where `24hagent-starter` has already completed local setup.
Your job is to onboard the project into Aegis without starting broad
implementation work.

## Product Boundary

```text
.claude/skills/superpower/
  Think clearly, ask clearly, split clearly, control scope, and prevent
  over-engineering before implementation starts.

.claude/skills/aegis-install/
  Convert the Superpower onboarding result into minimal Aegis runtime state.

.aegis/
  Store Aegis project state, quality gates, task packets, evidence, review
  reports, and handoff prompts.

Aegis CLI
  Run readiness, validation, discipline checks, review prompt generation,
  review rendering, verdict routing, and safety checks.

Codex
  Perform read-only cross-model review.
```

Superpower makes Claude Code think and work with discipline. Aegis keeps Claude
Code controlled after work starts and communicates with Codex for read-only
review.

## Hard Rules

- All user-facing output must be in English during starter onboarding.
- Phase 1 is read-only. Do not modify business code during intake.
- Use the bundled Superpower Pack at `.claude/skills/superpower/`.
- Do not put Claude Code skills under `.aegis/skills/`.
- Generate only minimal `.aegis` onboarding files.
- Do not create a large task queue during install onboarding.
- Stop before entering construction unless the user confirms.
- Do not install, remove, or upgrade dependencies unless the user explicitly approves.
- Do not edit secrets, credentials, tokens, cookies, or private config.
- Do not commit, push, merge, rebase, reset, deploy, release, publish, Docker push, or rewrite Git history.

## Phase 1: Read-Only Project Intake

Read available project signals. Prefer the smallest useful set:

```text
README.md
package.json
pyproject.toml
requirements.txt
src/
tests/
.aegis/
.claude/skills/superpower/
.claude/skills/aegis-install/
```

Then summarize:

- What the project appears to do.
- Detected technology stack.
- Current quality toolchain.
- Missing or high-risk setup items.
- Recommended onboarding route.

Do not write files in this phase.

## Phase 2: Superpower Clarification

Use or follow the bundled Superpower Pack. At minimum, consult:

```text
.claude/skills/superpower/SKILL.md
.claude/skills/superpower/skills/using-superpowers/SKILL.md
.claude/skills/superpower/skills/brainstorming/SKILL.md
.claude/skills/superpower/skills/writing-plans/SKILL.md
```

Clarify these five questions before writing onboarding state:

1. What is this project in one sentence?
2. What do you want Aegis to help with right now?
3. What is the stopping condition for this round?
4. Which files or directories must not be modified?
5. What type of work is this round: bug fix, tests, new feature, refactor, documentation, or quality-gate setup?

If `.aegis/config/quality-gates.json` has `project_type: "unknown"`, also ask
the user which stack this project should use. Do not assume Node.js or Python.
Use the answer to update the minimal onboarding files and quality-gate plan.

If the user answers vaguely, ask one focused follow-up. Do not fall into
endless clarification.

## Phase 3: Generate Minimal Aegis State

You may create or update only these onboarding files:

```text
.aegis/blueprint/project-blueprint.md
.aegis/blueprint/project-progress.md
.aegis/current/current-task.md
.aegis/current/status.md
.aegis/current/work-instruction.md
.aegis/current/decision-request.md
.aegis/config/quality-gates.json
.aegis/config/codex-rubric.md
.aegis/config/claude-code-contract.md
.aegis/state/run-state.json
```

Use the Superpower clarification result to fill the files. Keep them concise
and operational. Do not create a full backlog yet.

`decision-request.md` should ask the user to confirm the blueprint and first
bounded task before Claude Code starts construction.

## Phase 4: Stop Before Construction

When onboarding files are ready, stop and report:

- Installed skills.
- Project goal clarified by Superpower.
- Current task.
- Current boundaries and forbidden paths.
- Generated `.aegis` files.
- Whether the user wants Claude Code to run `aegis` and enter the delivery loop next.

Do not begin implementation until the user confirms.
