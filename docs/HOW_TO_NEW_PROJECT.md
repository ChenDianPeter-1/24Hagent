# Use Aegis In A New Project

This guide describes the current Aegis-first workflow. The bundled starter has been migrated to Aegis onboarding and is covered by the starter layout and setup smoke tests.

## Prerequisites

- A git repository for the target project
- Node.js 20+
- Claude Code available in the working environment
- Optional but recommended: Codex CLI configured for read-only review
- Optional but recommended: CodeGraph configured for structural review
- Superpower source files available to Claude Code

For this worktree, Superpower is expected at:

```text
D:\AAAOddsAndEnds\PROGRAM\superpowers
```

## Start

With the bundled starter:

```text
Copy aegis-starter/ into the target project.
Run aegis-starter/Start.ps1 or double-click Start.bat on Windows.
```

The starter installs `aegis-install`, initializes `.aegis/`, and generates:

```text
.aegis/current/next-claude-install-prompt.md
```

Inside Claude Code, ask:

```text
Use Aegis to start this project. My goal is ...
```

Claude Code should then run:

```bash
aegis
```

Aegis refreshes:

```text
.aegis/current/status.md
.aegis/current/work-instruction.md
.aegis/blueprint/project-progress.md
```

Claude Code reads those files and performs only the next instructed step.

## Blueprint Flow

For a new project, Claude Code should use Superpower brainstorming and Aegis blueprint commands:

```bash
aegis blueprint:start
```

Claude Code drafts or revises `.aegis/blueprint/project-blueprint.draft.md` using Superpower discipline.

Then:

```bash
aegis blueprint:summary
```

Aegis writes `.aegis/current/decision-request.md`. Claude Code asks the user to confirm or revise the blueprint.

After confirmation:

```bash
aegis blueprint:confirm
```

Aegis promotes the draft to `.aegis/blueprint/project-blueprint.md`.

## Task Flow

Generate the next bounded task:

```bash
aegis task:next
aegis task:review
```

The official current task is:

```text
.aegis/current/current-task.md
```

Claude Code must stay inside the task file scope, leave discipline evidence, and avoid expanding scope without human confirmation.

## Construction And Evidence

Aegis does not edit product code. When construction is needed, Aegis writes:

```text
.aegis/current/work-instruction.md
```

Claude Code performs the work and leaves evidence:

```text
.aegis/current/planning-evidence.md
.aegis/current/tdd-evidence.md
.aegis/current/debugging-evidence.md
.aegis/current/verification-evidence.md
.aegis/current/review-evidence.md
```

Required evidence depends on the task type. Feature work requires TDD or test-first evidence. Bug-fix work requires systematic debugging evidence. Planning, verification, and review evidence are required for completed construction rounds.

## Gates And Review

Run the current-round gate:

```bash
aegis round:check
```

The gate order is:

```text
safety -> task-quality -> superpower-discipline -> local-validation -> codex-prompt-readiness
```

If prerequisites pass, Aegis writes:

```text
.aegis/current/codex-review-prompt.md
```

Claude Code asks Codex for read-only review and saves the raw JSONL where Aegis expects it. Then:

```bash
aegis review:render
aegis
```

Aegis routes the result:

- `PASS`: archive the round and prepare continuation
- `NEED_FIX`: generate bounded repair instructions
- `NEED_HUMAN`: write human handoff and stop

## Modes

Aegis supports:

- `auto`: continue safe deterministic transitions
- `allow`: lower interruption, still with hard brakes
- `ask`: stop after meaningful phase boundaries and write `decision-request.md`

The mode is stored in `.aegis/state/run-state.json`.

## Safety

Aegis never executes:

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
- Git history rewrite

Aegis may render suggestions, but the human controls final Git and release actions outside Aegis.

## Current Starter Status

The bundled starter is now `aegis-starter/`. Its onboarding path is Aegis-first:

- installs `.claude/skills/aegis-install/`
- initializes `.aegis/config`, `.aegis/current`, `.aegis/blueprint`, and `.aegis/state`
- writes `.aegis/current/next-claude-install-prompt.md`
- ships `aegis-starter/bin/aegis.mjs`

The setup smoke test runs the starter in a temporary target project and verifies
the generated `.aegis/` layout.
