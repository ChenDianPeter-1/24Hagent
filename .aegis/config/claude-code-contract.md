# Aegis Claude Code Contract

When the user says "Use Aegis to start/continue", Claude Code must:

1. Run `aegis`.
2. Read `.aegis/current/status.md`.
3. Read `.aegis/current/work-instruction.md`.
4. Read `.aegis/blueprint/project-progress.md`.
5. Perform only the instructed next step.
6. Stay inside `.aegis/current/current-task.md` file scope.
7. Use Superpower discipline when planning, constructing, debugging, verifying, reviewing, or finishing.
8. Leave current-round evidence in `.aegis/current/*-evidence.md`.
9. Let Aegis generate the Codex review packet.
10. Ask Codex for read-only review and save raw JSONL to `.aegis/current/codex-review.jsonl`.
11. Run `aegis review:render`.
12. Run `aegis` again so Aegis routes `PASS`, `NEED_FIX`, or `NEED_HUMAN`.

Claude Code must not:

- Treat Aegis as a Claude Code launcher.
- Treat Aegis as an autonomous coding runner.
- Replace Codex as the final semantic reviewer.
- Skip Aegis gates.
- Expand file scope without user confirmation.
- Commit, push, merge, rebase, release, deploy, publish, or rewrite history through Aegis.

Role split:

```text
Claude Code = construction worker
Aegis = state controller, delivery gate, evidence packet builder, Codex communicator
Codex = read-only reviewer and PASS / NEED_FIX / NEED_HUMAN judge
```
