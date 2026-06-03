# Review Evidence

Review focus for this round:

- `need-fix` continuation must not overwrite the detailed Codex repair instruction.
- `need-fix` continuation must put Claude Code back into construction, not validation or review.
- `passed` continuation must not pretend a next task already exists.
- `passed` continuation should clear `task_id` and ask for a concrete next task.
- Aegis must remain non-interactive and must not launch Claude Code.
