---
name: superpower
description: Use during 24Hagent onboarding to load the bundled Superpower Pack for clarification, scope control, planning, debugging, TDD, code review, and verification workflows.
---

# Superpower Pack

This directory contains the bundled Superpower Pack used by 24Hagent starter.
It is installed into the target project at:

```text
.claude/skills/superpower/
```

The pack is intentionally separate from `.agent/`. Claude Code skills belong in
`.claude/skills/`; 24Hagent runtime state belongs in `.agent/`.

## How To Use This Pack

Start with:

```text
skills/using-superpowers/SKILL.md
```

Then choose the relevant workflow skill:

- `skills/brainstorming/SKILL.md` for requirements clarification and design shaping.
- `skills/writing-plans/SKILL.md` for implementation plans.
- `skills/test-driven-development/SKILL.md` for TDD execution.
- `skills/systematic-debugging/SKILL.md` for bug investigation.
- `skills/requesting-code-review/SKILL.md` and `skills/receiving-code-review/SKILL.md` for review loops.
- `skills/verification-before-completion/SKILL.md` before claiming work is done.

During 24Hagent install onboarding, use Superpower to clarify project intent,
current goal, scope, forbidden paths, work type, and stopping condition before
writing minimal `.agent` files.
