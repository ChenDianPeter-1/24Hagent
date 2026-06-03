# Review Evidence

Review focus for this round:

- `review:render` must not invent a verdict; it must consume Codex JSONL parsed by the existing review schema.
- `PASS` routing must not ask Claude Code for extra work.
- `NEED_FIX` routing must give Claude Code bounded fixes and increment retry count.
- `NEED_HUMAN` routing must stop and write a handoff packet instead of guessing.
- Legacy `.agent` rendering should stay compatible because migration is still incremental.
