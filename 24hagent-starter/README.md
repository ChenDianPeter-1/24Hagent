# 24Hagent Starter

24Hagent Starter turns first-time project onboarding into a guided Claude Code
setup flow. Copy this folder into a project, double-click `Start.bat`, and the
starter will install the local 24Hagent runtime plus the bundled Superpower Pack.

## What Gets Installed

```text
target-project/
+-- .claude/
|   +-- skills/
|       +-- superpower/
|       +-- 24hagent-install/
+-- .agent/
    +-- QUALITY_GATES.json
    +-- NEXT_CLAUDE_INSTALL_PROMPT.md
```

`superpower/` is Claude Code's product-thinking and workflow layer. It helps
Claude clarify goals, control scope, shape tasks, and avoid over-engineering
before implementation starts.

`.agent/` is 24Hagent runtime state. It stores quality gates, task packets,
review prompts, reports, and project state. Do not put Claude Code skills under
`.agent/skills/`.

## Windows Quick Start

1. Copy `24hagent-starter/` into your target project.
2. Open the folder and double-click `Start.bat`.
3. Let the starter finish local setup.
4. If Claude CLI is available, Claude Code will start from the project root.
5. If Claude CLI is not available, paste the copied prompt from:

```text
.agent/NEXT_CLAUDE_INSTALL_PROMPT.md
```

## What Start.bat Does

`Start.bat` runs `Start.ps1`, which:

- switches to the target project root;
- creates `.agent/` and `.claude/skills/`;
- installs the complete Superpower Pack to `.claude/skills/superpower/`;
- installs the 24Hagent onboarding skill to `.claude/skills/24hagent-install/`;
- creates `.agent/QUALITY_GATES.json` if it does not exist;
- generates `.agent/NEXT_CLAUDE_INSTALL_PROMPT.md`;
- copies the install prompt to the clipboard when possible;
- runs the 24Hagent readiness check;
- tries to launch `claude` from the project root;
- passes the install prompt to `claude` automatically when the local CLI supports prompt arguments.

If `claude` is not on PATH, setup still completes and prints clear next steps.

For an empty project with no `package.json`, `pyproject.toml`,
`requirements.txt`, or Python files, the starter uses `project_type: unknown`.
It does not choose Node.js or Python for you. Quality gates are created as
disabled `NEEDS_CONFIG` placeholders, readiness is skipped, and Claude
onboarding asks you to clarify the stack with Superpower before finalizing
`.agent` state.

## Claude Onboarding Flow

The generated install prompt tells Claude Code to read:

```text
.claude/skills/24hagent-install/SKILL.md
```

That skill requires Claude to:

- begin with read-only project intake;
- use `.claude/skills/superpower/` for clarification and scope control;
- clarify project goal, current task, stopping condition, forbidden paths, and work type;
- generate only minimal `.agent` onboarding files;
- stop before entering the Orchestrator loop unless the user confirms.

## Optional Manual Command

If double-click launch is not suitable, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 24hagent-starter/Start.ps1
```

For setup without launching Claude:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 24hagent-starter/Start.ps1 -NoClaude
```

## Requirements

- Node.js 20 or newer for the bundled 24Hagent CLI.
- Claude CLI on PATH if you want automatic Claude Code launch.
- A project with `package.json`, `pyproject.toml`, `requirements.txt`, `src/`,
  or `tests/` gives the starter better onboarding signals.

## After Setup

Claude Code takes over the install onboarding through `24hagent-install`.
It will ask for confirmation before entering the Orchestrator loop.
