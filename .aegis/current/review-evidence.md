# Review Evidence

Review focus for this round:

- `auto`, `allow`, and `ask` must differ in continuation behavior while preserving non-interactive Aegis boundaries.
- `ask` must write decision requests that Claude Code can present to the human.
- `allow` must not become an infinite loop; configured round and repair limits remain hard brakes.
- Repeated `NEED_FIX` at the repair limit must produce human handoff instead of more construction.
- Navigation files must explain mode decisions so Claude Code knows why Aegis continued or stopped.
