# Aegis Starter

Aegis Starter turns first-time project onboarding into a guided Claude Code setup
flow. Copy this folder into a project, double-click `Start.bat`, and the starter
will install the local Aegis runtime plus the bundled Superpower Pack.

## What Gets Installed

```text
target-project/
+-- .claude/
|   +-- skills/
|       +-- superpower/
|       +-- aegis-install/
+-- .aegis/
    +-- config/
    |   +-- quality-gates.json
    |   +-- codex-rubric.md
    +-- current/
    |   +-- next-claude-install-prompt.md
    +-- state/
        +-- run-state.json
```

`superpower/` is Claude Code's product-thinking and workflow discipline layer.
It helps Claude clarify goals, control scope, shape tasks, and avoid
over-engineering before implementation starts.

`.aegis/` is Aegis runtime state. It stores quality gates, task packets, review
prompts, reports, evidence, project state, and handoff prompts. Do not put
Claude Code skills under `.aegis/skills/`.

## Windows Quick Start

1. Copy `aegis-starter/` into your target project.
2. Open the folder and double-click `Start.bat`.
3. Let the starter finish local setup.
4. If Claude CLI is available, Claude Code will start from the project root.
5. If Claude CLI is not available, paste the copied prompt from:

```text
.aegis/current/next-claude-install-prompt.md
```

## What Start.bat Does

`Start.bat` runs `Start.ps1`, which:

- switches to the target project root;
- creates `.aegis/` and `.claude/skills/`;
- installs the complete Superpower Pack to `.claude/skills/superpower/`;
- installs the Aegis onboarding skill to `.claude/skills/aegis-install/`;
- creates `.aegis/config/quality-gates.json` if it does not exist;
- creates `.aegis/config/codex-rubric.md` if it does not exist;
- creates `.aegis/state/run-state.json` if it does not exist;
- generates `.aegis/current/next-claude-install-prompt.md`;
- copies the install prompt to the clipboard when possible;
- runs the Aegis readiness check when the project stack is known;
- tries to launch `claude` from the project root;
- passes the install prompt to `claude` automatically when the local CLI supports prompt arguments.

If `claude` is not on PATH, setup still completes and prints clear next steps.

For an empty project with no `package.json`, `pyproject.toml`,
`requirements.txt`, or Python files, the starter uses `project_type: unknown`.
It does not choose Node.js or Python for you. Quality gates are created as
disabled `NEEDS_CONFIG` placeholders, readiness is skipped, and Claude
onboarding asks you to clarify the stack with Superpower before finalizing
`.aegis` state.

## Claude Onboarding Flow

The generated install prompt tells Claude Code to read:

```text
.claude/skills/aegis-install/SKILL.md
```

That skill requires Claude to:

- begin with read-only project intake;
- use `.claude/skills/superpower/` for clarification and scope control;
- clarify project goal, current task, stopping condition, forbidden paths, and work type;
- generate only minimal `.aegis` onboarding files;
- stop before entering construction unless the user confirms.

## Optional Manual Command

If double-click launch is not suitable, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1
```

For setup without launching Claude:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1 -NoClaude
```

## Requirements

- Node.js 20 or newer for the bundled Aegis CLI.
- Claude CLI on PATH if you want automatic Claude Code launch.
- A project with `package.json`, `pyproject.toml`, `requirements.txt`, `src/`,
  or `tests/` gives the starter better onboarding signals.

## After Setup

Claude Code takes over the install onboarding through `aegis-install`.
It will ask for confirmation before entering the Aegis-governed delivery loop.

Starter onboarding teaches only `aegis`.
