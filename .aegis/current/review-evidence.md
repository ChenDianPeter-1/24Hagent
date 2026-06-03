# Review Evidence

Review focus for this round:

- `round:check` must stop in the right order and must not generate a Codex prompt when prerequisite gates fail.
- Aegis may package evidence and render a prompt, but it must not execute Codex itself.
- The generated prompt must preserve Codex as the external read-only reviewer.
- Local validation must read `.aegis/config/quality-gates.json`.
- Codex `PASS`, `NEED_FIX`, and `NEED_HUMAN` routing must remain distinct and deterministic.
