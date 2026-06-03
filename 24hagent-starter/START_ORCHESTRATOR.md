# Start Aegis In Claude Code

This file contains copyable prompts for using Aegis after starter setup.
Aegis is hosted by Claude Code; it does not launch Claude Code by itself.

## Start

Copy this into Claude Code:

```text
Use Aegis to start this project.

Read:
- .claude/skills/aegis-install/SKILL.md
- .claude/skills/superpower/SKILL.md
- .aegis/current/next-claude-install-prompt.md

Begin with read-only project intake. Use Superpower to clarify the product goal,
scope, forbidden paths, stopping condition, and first bounded task. Generate only
minimal .aegis onboarding files, then stop and ask me to confirm before
construction begins.
```

## Continue

Copy this into Claude Code:

```text
Use Aegis to continue this project.

Run `aegis`, then read the generated .aegis/current/status.md and
.aegis/current/work-instruction.md. Do only the instructed next step. Leave
planning, TDD or debugging, verification, and review evidence under
.aegis/current/ before asking Aegis for the next gate.
```

## Review

Copy this into Claude Code when local gates are ready for Codex:

```text
Use Aegis to prepare Codex review.

Run `aegis round:check`. If Aegis writes .aegis/current/codex-review-prompt.md,
ask Codex for read-only review with that prompt. Save Codex JSONL where Aegis
expects it, then run `aegis review:render` and `aegis`.
```

## Boundaries

Aegis must not commit, push, merge, rebase, reset, deploy, release, publish,
Docker push, launch Claude Code, execute Codex, or rewrite Git history. It may
render suggestions and handoff files; the human controls final Git and release
actions.
