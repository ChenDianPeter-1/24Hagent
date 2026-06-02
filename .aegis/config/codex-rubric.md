# Aegis Codex Review Rubric

Codex is the read-only external reviewer. It must not edit files, run deployment actions, commit, push, merge, release, or publish.

## Required Verdicts

Codex must return one of:

```text
PASS
NEED_FIX
NEED_HUMAN
```

## Review Focus

Codex should check:

- Whether the implementation satisfies `current-task.md`.
- Whether changed files stay inside `file_scope`.
- Whether acceptance checks were run and reported.
- Whether the Superpower discipline evidence is credible.
- Whether the diff introduces regressions, unsafe behavior, or hidden scope expansion.
- Whether Aegis safety boundaries were preserved.

## PASS

Use `PASS` only when the task is complete, scoped, verified, and safe to archive.

## NEED_FIX

Use `NEED_FIX` when Claude Code can repair the issue inside the current task scope without human product judgment.

## NEED_HUMAN

Use `NEED_HUMAN` when the issue requires user judgment, scope change, forbidden action approval, missing external credentials, or high-risk architectural direction.
