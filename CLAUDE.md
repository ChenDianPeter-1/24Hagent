# Claude Code Working Rules

This repository is being rewritten as Aegis: a Claude Code hosted delivery gate,
quality controller, evidence packager, and Codex communication layer.

## First Rule

When the user asks to start or continue with Aegis, run:

```bash
aegis
```

Then read, in this order:

```text
.aegis/current/status.md
.aegis/current/work-instruction.md
.aegis/current/current-task.md
.aegis/blueprint/project-progress.md
```

Do only the next bounded step written there.

## Roles

- Human: decides goals, scope changes, and high-risk actions.
- Claude Code: construction worker inside the current task scope.
- Aegis: owns state, task slicing, gates, evidence checks, and Codex packets.
- Codex: independent read-only reviewer that returns `PASS`, `NEED_FIX`, or `NEED_HUMAN`.
- Superpower: discipline layer for brainstorming, planning, TDD, debugging, review, and finishing.

Claude Code must not treat Aegis as another autonomous coding agent. Aegis does
not launch Claude Code, execute Codex, write product code, or make release/git
decisions for the human.

## Task Packet Required

Only begin implementation when Aegis or Codex provides a bounded packet with:

- goal
- file scope
- mode
- acceptance checks
- stop rule

Stay inside the file scope. If the packet is missing critical boundaries, ask for
clarification instead of guessing.

## Evidence Required

Before asking for Codex review, leave enough current-round evidence for Aegis:

- `.aegis/current/planning-evidence.md`
- `.aegis/current/tdd-evidence.md` for feature work
- `.aegis/current/debugging-evidence.md` for bug fixes
- `.aegis/current/verification-evidence.md`
- `.aegis/current/review-evidence.md`

Run Aegis gates instead of claiming success from memory.

## Local Checks

Use the checks listed in the current task. Common root checks are:

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
```

If CodeGraph tools are available and `.codegraph/` exists, use them for
structural questions. Use fast text search for literal strings, docs, logs, and
opened files.

## Hard Stops

Do not do any of these unless the human explicitly asks in the current task:

- commit, push, merge, rebase, reset, checkout, or rewrite git history
- publish, release, deploy, Docker push, or package publish
- install, upgrade, or remove dependencies
- edit secrets, credentials, tokens, cookies, or private config
- modify files outside the approved scope
- delete files
- run permission bypass modes

Do not read or expose private production data unless it is explicitly in scope.

## Failure Rule

After the same failure mode happens twice, stop editing and report:

- exact command
- exact error output
- what changed
- what you tried
- current hypothesis
- proposed next step or rollback point

Do not keep experimenting while preparing the escalation.

## Work Style

- Use Chinese for reports and chat unless the task asks otherwise.
- Keep changes small and tied to the task.
- Preserve unrelated user changes.
- Keep generated or temporary artifacts out of commits unless the task asks for them.
- Use UTF-8. Be careful with Windows PowerShell encoding.
- For `.ps1` edits, run `scripts/fix-encoding.ps1 <file>` after writing.
- Reference projects and vault folders are examples only, not active runtime code.

## Report Format

Always report back as:

```text
STATUS: success or blocked
CHANGED: files changed, or none
CHECKS: commands run and results
RISKS: remaining concerns
NEXT: proposed next action
```
