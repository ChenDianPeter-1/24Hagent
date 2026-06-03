# Aegis

Aegis is a non-interactive delivery gate that lives inside Claude Code.

It does not replace Claude Code, and it does not become another autonomous coding agent. Claude Code remains the construction worker. Aegis owns state, task slicing, evidence, local gates, Codex review packets, verdict routing, and safety boundaries.

```text
Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
```

## Product Role

The human talks to Claude Code:

```text
Use Aegis to start.
Use Aegis to continue.
```

Claude Code runs `aegis`, reads the generated navigation files, performs only the instructed work, leaves evidence, and runs Aegis again. Codex remains the independent read-only reviewer that returns `PASS`, `NEED_FIX`, or `NEED_HUMAN`.

Aegis does not:

- launch Claude Code
- execute Codex
- write product code
- ask terminal prompts
- commit, push, merge, rebase, reset, deploy, release, publish, or rewrite Git history

## Runtime Shape

```text
.aegis/
  config/
    aegis.json
    quality-gates.json
    codex-rubric.md
    claude-code-contract.md
  blueprint/
    project-blueprint.md
    project-progress.md
  current/
    current-task.md
    status.md
    work-instruction.md
    decision-request.md
    human-handoff.md
    round-summary.md
    *-evidence.md
  state/
    run-state.json
  archive/
    <task-id>/
```

`state/run-state.json` is the compact machine source of truth. Navigation files are generated for Claude Code to read. Detailed completed-round material is copied into `.aegis/archive/<task-id>/`.

## Main Commands

| Command | Purpose |
|---|---|
| `aegis` | Refresh navigation and advance the current state until Aegis must stop |
| `aegis contract` | Print the Claude Code hosting contract |
| `aegis blueprint:start` | Prepare a Superpower-guided blueprint draft workspace |
| `aegis blueprint:summary` | Render a blueprint summary and decision request |
| `aegis blueprint:confirm` | Promote the draft to the confirmed project blueprint |
| `aegis task:next` | Generate the next formal current task |
| `aegis task:review` | Check current-task quality before construction |
| `aegis superpower:scan` | Record Superpower source references |
| `aegis discipline:check` | Verify current-round Superpower discipline evidence |
| `aegis round:check` | Run safety, task quality, discipline, validation, and Codex prompt readiness |
| `aegis review:prompt` | Generate a read-only Codex review prompt |
| `aegis review:render` | Render Codex JSONL into an Aegis review result |
| `aegis safety:check` | Check forbidden actions and file-scope safety |
| `aegis commit:suggest` | Render a human-facing commit suggestion after Codex `PASS` |

`24h` remains a compatibility alias during migration. New docs and workflows should teach `aegis`.

## Current Implementation

The Aegis rewrite is tracked in GitHub issue `#14` on branch `aegis-repositioning`.

Implemented slices include:

- Aegis product decisions, runtime spec, and roadmap
- `.aegis/` runtime scaffold and compact run state
- `aegis` CLI identity with `24h` compatibility alias
- Claude Code hosting contract
- blueprint start, summary, and confirmation flow
- current-task generation and task-quality review
- automatic navigation refresh
- Superpower source scan and current-round discipline gate
- quality gates and Codex read-only review packet generation
- safety boundaries and forbidden action enforcement
- `auto`, `allow`, and `ask` progression modes
- completed-round archival under `.aegis/archive/<task-id>/`
- bundled starter onboarding migrated to Aegis / `.aegis`

The strongest remaining migration work is now deeper verification and cleanup: add a real starter smoke test, audit `.agent` compatibility fallback paths, and decide whether old Python onboarding docs should be rewritten or archived.

## Verification

Core validation used during the rewrite:

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
```

`aegis round:check` is intentionally stricter than `npm test`: it evaluates the configured quality gates, including the current 100% coverage threshold. When coverage is below that threshold, it returns `NEED_FIX` before generating a Codex prompt.

## Reference Documents

- `docs/AEGIS_PRODUCT_DECISIONS.md`
- `docs/AEGIS_RUNTIME_SPEC.md`
- `docs/AEGIS_MVP_ROADMAP.md`
- `docs/AEGIS_CLAUDE_CODE_CONTRACT.md`
- `docs/HANDOFF.md`
- `docs/HOW_TO_NEW_PROJECT.md`
