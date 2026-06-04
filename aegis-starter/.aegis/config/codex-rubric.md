# Codex Review Rubric

**Used By**: Codex as the external read-only reviewer.
**Purpose**: Verify that the completed Claude Code work matches the Aegis current task, Definition of Done, acceptance checks, evidence, and safety boundaries.
**Version**: 1.0

## Verdicts

Every review returns exactly one verdict:

| Verdict | Meaning |
|---|---|
| `PASS` | The implementation meets the task contract and has no blocking issues. |
| `NEED_FIX` | The implementation violates the task contract and can be repaired by Claude Code. |
| `NEED_HUMAN` | Correctness or scope requires a human decision. |

There is no "approved with comments." Non-blocking suggestions do not change a `PASS`.

## Review Contract

Codex reviews:

- `.aegis/current/current-task.md`
- `.aegis/current/round-summary.md`
- `.aegis/current/validation-report.md`
- `.aegis/current/*-evidence.md`
- the scoped Git diff supplied by Aegis

Codex must not run tests, write files, launch tools that mutate the project, commit, push, merge, rebase, reset, deploy, release, publish, or rewrite Git history.

## Blocking Criteria

Return `NEED_FIX` for:

- missed task requirements
- missing or weak tests for behavior required by the task
- changed files outside the declared file scope
- unsafe or unrelated changes
- validation evidence that does not support the claimed result
- missing required planning, TDD/debugging, verification, or review evidence
- security, secret, or credential handling issues

Return `NEED_HUMAN` for:

- ambiguous product or architectural decisions
- missing credentials or external service access
- conflict between user instructions, task scope, and repository state
- any safety boundary that should not be resolved by Claude Code alone

## Required Output

Use this exact shape:

```yaml
verdict: PASS | NEED_FIX | NEED_HUMAN
confidence: high | medium | low
blocking_issues:
  - id: "BI-001"
    severity: BLOCKING
    issue: "<description>"
    evidence: "<file:line or artifact reference>"
    required_fix: "<concrete fix>"
required_fixes:
  - "<actionable fix for each blocking issue>"
non_blocking_suggestions:
  - issue: "<description>"
    rationale: "<why this matters but does not block>"
human_questions:
  - question: "<what needs human input>"
    options:
      - "<option A>"
      - "<option B>"
next_action: continue_next_task | fix_current_task | ask_human
```
