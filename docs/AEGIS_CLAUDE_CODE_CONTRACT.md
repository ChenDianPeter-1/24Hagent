# Aegis Claude Code Contract

This contract defines how Claude Code hosts Aegis.

Aegis is not a Claude Code launcher. Aegis is the local non-interactive state controller, delivery gate, evidence packager, and Codex communication layer. Claude Code remains the interactive shell and construction worker.

## Trigger

When the user says any of the following:

- "Use Aegis to start."
- "Use Aegis to continue."
- "Continue with Aegis."
- "Start Aegis."

Claude Code must run:

```bash
aegis
```

Then Claude Code must read:

```text
.aegis/current/status.md
.aegis/current/work-instruction.md
.aegis/blueprint/project-progress.md
```

## Claude Code Responsibilities

Claude Code must:

- Follow only the next action and boundaries written by Aegis.
- Stay inside `.aegis/current/current-task.md` file scope during construction.
- Use Superpower discipline for brainstorming, planning, TDD, debugging, review, and finishing as required by the current task.
- Leave current-round discipline evidence in `.aegis/current/*-evidence.md`.
- Run local gates through Aegis commands instead of claiming self-reported success.
- Ask Codex for read-only review only after Aegis has produced a Codex review packet.
- Save Codex raw JSONL where Aegis expects it.
- Run `aegis` again after Codex review so Aegis can route the verdict.

Claude Code must not:

- Treat Aegis as an autonomous coding agent.
- Expand scope without user confirmation.
- Skip Aegis gates because local tests appear to pass.
- Replace Codex as the final semantic reviewer.
- Commit, push, merge, rebase, release, deploy, publish, or rewrite history unless the human explicitly asks outside Aegis.

## Round Flow

```text
Human asks Claude Code to use Aegis
Claude Code runs aegis
Aegis refreshes navigation files and prints the next action
Claude Code reads the files and performs only the instructed step
Claude Code leaves discipline evidence
Claude Code runs the required Aegis gates
Aegis builds the Codex review packet
Codex performs read-only review and returns PASS / NEED_FIX / NEED_HUMAN
Claude Code saves raw Codex JSONL
Claude Code runs aegis again
Aegis routes the verdict
```

## Verdict Handling

`PASS` means Codex found no blocking issue. Aegis may mark the round passed and prepare next-task selection or archive behavior.

`NEED_FIX` means Claude Code must repair only the bounded fixes written by Aegis, then rerun validation, discipline checks, and Codex review.

`NEED_HUMAN` means Claude Code must stop and surface `.aegis/current/human-handoff.md` to the user.

## Evidence Contract

Claude Code must leave enough evidence for Aegis to verify discipline before Codex review:

- `planning-evidence.md`
- `tdd-evidence.md` for feature-style work
- `debugging-evidence.md` for bug-fix work
- `verification-evidence.md`
- `review-evidence.md`

Missing required evidence fails before Codex review.

## Product Boundary

Aegis writes state, gates, packets, and instructions. Claude Code constructs. Codex judges.
