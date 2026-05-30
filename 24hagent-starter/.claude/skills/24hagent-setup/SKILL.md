---
name: 24hagent-setup
description: |
  Install 24Hagent into any project. Use this skill whenever the user says
  things like "install 24Hagent", "setup 24Hagent", "help me install 24Hagent",
  "configure 24Hagent", or "set up the orchestrator". Also use this when the
  user mentions they want an AI orchestrator, autonomous task runner, or
  cross-model code reviewer for their project — even if they don't say
  "24Hagent" by name.
---

# 24Hagent Setup

Install the 24Hagent orchestrator into the user's project. The user has
already copied a `24hagent-starter/` folder into their project root. Your job
is to turn that folder into a working 24Hagent installation.

## What you are installing

24Hagent = a resident orchestrator inside Claude Code. It reads a project
blueprint, breaks work into tasks, dispatches a Worker (also Claude Code),
runs quality gates (test/lint/typecheck/coverage), calls Codex as an external
cross-model reviewer, and decides continue/fix/stop. Three iron rules:

1. Testing belongs to Claude Code — Codex never runs tests
2. Codex is strictly read-only (`--sandbox read-only`)
3. Which tests to run is declared upfront in `CURRENT_TASK.md.acceptance_checks`

## Pre-flight: check that the starter folder exists

The user copied a folder called `24hagent-starter/` into their project root.
Confirm it exists at `<project-root>/24hagent-starter/`. If it doesn't, tell
the user:

> I don't see a `24hagent-starter/` folder in your project. Copy that folder
> from the 24Hagent repository into your project root first, then say
> "install 24Hagent" again.

## Setup procedure

Execute these steps in order. If any step fails, report the exact failure and
ask the user how to proceed — don't skip steps.

### Step 1: Detect toolchain

Read the project's `package.json` and `tsconfig.json` (if they exist). From
`package.json`, inspect `scripts` and `devDependencies` + `dependencies`.

Determine these four commands:

- **test**: look for vitest/jest/mocha in deps, then fall back to the `test`
  script in package.json. If the test script is an npm default placeholder
  (contains "no test specified" or is just `echo ... && exit 1`), treat it as
  "no real test runner" — the test gate command should be empty.
- **lint**: look for eslint/biome in deps. Command is `npx eslint src/` for
  eslint, `npx biome check .` for biome. If neither is found, lint gate is empty.
- **typecheck**: if `tsconfig.json` exists, command is `npx tsc --noEmit`. If
  the project has a `typecheck` script, prefer `npm run typecheck`.
- **coverage**: if using vitest, `npm run coverage` or `npx vitest run --coverage`.
  If jest, `npm run coverage` or `npx jest --coverage`.

Print the detected commands to the user before proceeding.

### Step 2: Copy starter files to project root

Copy these from the starter folder to the project root:

| From (inside 24hagent-starter/) | To (project root) |
|---|---|
| `scripts/` | `scripts/` |
| `CLAUDE_ORCHESTRATOR_PROTOCOL.md` | `CLAUDE_ORCHESTRATOR_PROTOCOL.md` |
| `START_ORCHESTRATOR.md` | `START_ORCHESTRATOR.md` |
| `.agent/CODEX_REVIEW_RUBRIC.md` | `.agent/CODEX_REVIEW_RUBRIC.md` |
| `.claude/skills/brainstorming/` | `.claude/skills/brainstorming/` |

Do NOT copy `24hagent-starter/.claude/skills/24hagent-setup/` — that skill is
only needed during setup, not after.

Use PowerShell's `Copy-Item -Recurse -Force` for directories. Create parent
directories if they don't exist (e.g., `.agent/`, `.claude/skills/`).

### Step 3: Generate QUALITY_GATES.json

Create `.agent/QUALITY_GATES.json` using the commands detected in Step 1.

**Auto-decision rule for each gate:**
- If the toolchain command was detected → `enabled: true`
- If not detected → `enabled: false`, command left empty, and note this
  in the gate's `description` field (e.g., "NEEDS CONFIG: install a linter")
- **Do NOT ask the user which gates to skip.** The toolchain detection
  already answers this. Only ask if a detected command looks ambiguous
  (e.g., multiple test runners found).

Coverage threshold is always 100%.

```json
{
  "tdd_required": true,
  "gates": {
    "test": {
      "enabled": true,
      "blocking": true,
      "command": "<detected test command or empty>",
      "description": "All tests must pass"
    },
    "lint": {
      "enabled": <true if lint tool detected, else false>,
      "blocking": true,
      "command": "<detected lint command or empty>",
      "description": "No lint errors allowed"
    },
    "typecheck": {
      "enabled": <true if tsconfig.json exists>,
      "blocking": true,
      "command": "<detected typecheck command or empty>",
      "description": "No type errors allowed"
    },
    "coverage": {
      "enabled": <true if coverage tool detected>,
      "blocking": true,
      "command": "<detected coverage command or empty>",
      "threshold": { "lines": 100, "branches": 100, "functions": 100, "statements": 100 },
      "description": "100% coverage required"
    }
  }
}
```

Write the file with UTF-8 encoding (no BOM).

After writing, print a summary showing which gates are enabled and which are
disabled (with the reason why). For example:

> Quality gates:
>   test: ENABLED (vitest)
>   lint: ENABLED (eslint)
>   typecheck: ENABLED (tsc)
>   coverage: ENABLED (vitest)

If any gate is disabled, add a note like:

> NOTE: The lint gate is disabled because no linter was detected.
> Install eslint (`npm install --save-dev eslint`) and re-run readiness
> check to enable it.

### Step 4: Generate PROJECT_BLUEPRINT.md draft

Ask the user 2 questions only. Do NOT ask about quality gates — that was
decided automatically in Step 3.

**Q1:** "What does your project do? Describe it in one sentence."

**Q2:** "What are the MVP features? List them separated by commas."
   Parse the answer into a list. If the user gives a long description instead
   of a comma list, extract the features and confirm with them.

Then generate `.agent/PROJECT_BLUEPRINT.md` using this template:

```markdown
# Project Blueprint

## Project Goal
<Q1 answer>

## MVP Scope
### In Scope
<Q2 features as bullet list>

### Out of Scope
<!-- What is explicitly NOT in scope -->

## Technical Boundaries
- <detected test runner, typechecker, linter>

## Phase Goals
| Phase | Goal | Deliverable |
|-------|------|-------------|
| 1 | Core features | All MVP functions working |
| 2 | Edge cases | Comprehensive tests and docs |

## Acceptance Criteria
- All tests pass
- 100% coverage (lines/branches/functions/statements)
- No type errors
- No lint errors

## Prohibited Actions
- Do not auto-push to remote
- Do not auto-merge branches
- Do not delete files without human approval
- Do not modify secrets, credentials, or tokens
- Do not install/remove dependencies without human approval
- Do not modify files outside the approved scope
```

After writing the file, tell the user:

> I've generated a draft blueprint at `.agent/PROJECT_BLUEPRINT.md`.
> Would you like me to use the brainstorming skill to refine it?
> If yes, say "use brainstorming to refine the blueprint."

### Step 5: Run readiness check

Execute the readiness check script:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
```

Read the output. Three possible outcomes:

- **READY** → proceed to Step 6 (final message).
- **NEEDS_CONFIG** → tell the user which commands don't match between
  QUALITY_GATES.json and the detected toolchain. Suggest they compare
  `.agent/QUALITY_GATES.json` with `.agent/QUALITY_GATES_SUGGESTED.json`.
  This is usually a minor config mismatch — the toolchain is fine but the
  gate commands need minor adjustments.
- **BLOCKED** → the project doesn't have the necessary toolchain installed.
  Report the blocking issues from the readiness report and tell the user
  what to install (e.g., "Install vitest: `npm install --save-dev vitest`").
  Do NOT continue until the user fixes the toolchain and re-runs the check.

### Step 6: Final message

When readiness is READY, print this exact message:

```
24Hagent is ready.

NEXT: Delete the 24hagent-starter folder — it's no longer needed.
Then tell Claude Code:

  "read CLAUDE_ORCHESTRATOR_PROTOCOL.md and .agent/PROJECT_BLUEPRINT.md,
   then start the orchestrator."
```

If readiness was NEEDS_CONFIG but the user chose to proceed anyway, add:

```
NOTE: Quality gate configuration has minor mismatches. Review
.agent/QUALITY_GATES_SUGGESTED.json and adjust .agent/QUALITY_GATES.json
before starting the orchestrator loop.
```

## Guardrails

- All user-facing output must be in English.
- Never proceed past a BLOCKED readiness check without the user explicitly
  asking to continue.
- If the project has no `package.json`, tell the user this project doesn't
  look like a Node.js project. Ask if they still want to proceed (some gates
  will be unavailable).
- The brainstorming skill is optional — suggest it, don't force it.
- Never modify files outside the project root.
- The `24hagent-starter/` folder itself should NOT be deleted by you — the
  user deletes it manually after seeing the final message.
