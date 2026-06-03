# Review Evidence

Review focus for this round:

- Safety detection must hard-block actual forbidden action instructions while allowing prohibition text such as "Do not run git commit."
- Dirty worktree reporting must be informational unless changed files exceed current task scope.
- File-scope violations must become hard safety blocks.
- Commit suggestions must be rendered only after Codex `PASS`.
- Aegis must continue to avoid executing commit, push, merge, rebase, reset, release, deploy, publish, or history rewrite actions.
