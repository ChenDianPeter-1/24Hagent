# 24Hagent Starter

This folder is a 24Hagent distribution kit. When a user copies it into their
project and opens Claude Code, your job is to install 24Hagent into that
project.

## Detection

You are inside a project that has a `24hagent-starter/` folder at the root.
This means the user wants to install 24Hagent.

## What to do

The user will say something like "install 24Hagent" or "help me set this up".
When they do:

1. Read `.claude/skills/24hagent-setup/SKILL.md` inside this starter folder.
2. Follow its instructions exactly, from Step 1 through Step 6.
3. The skill will guide you through: toolchain detection, file copying,
   quality gate generation, blueprint drafting, and readiness checking.

## Critical rules

- Do NOT start the orchestrator loop during setup. Setup only prepares the
  project. The orchestrator starts later, after the user deletes this folder
  and gives the explicit start command.
- Do NOT delete the `24hagent-starter/` folder yourself. The user deletes it
  manually after setup completes.
- All output to the user must be in English during setup.
- The brainstorming skill at `.claude/skills/brainstorming/` will be copied
  into the project and can be used later to refine the blueprint.
- 24hagent-setup skill itself is NOT copied to the project — it's only for
  one-time setup use.

## After setup

When the setup skill finishes, it will print a final message telling the user:
- Delete this folder
- Start the orchestrator with a specific prompt

Do NOT take any action beyond what the setup skill instructs.
