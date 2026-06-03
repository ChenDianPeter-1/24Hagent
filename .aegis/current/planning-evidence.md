# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets the missing link after Codex review rendering: Aegis must consume the Codex verdict and route state.

The implementation plan is:

- Add a small Aegis runtime routing helper for Codex review results.
- Keep `review:render` as the handoff point from raw Codex JSONL to Aegis runtime state.
- Route `PASS` to `passed`, `NEED_FIX` to `need-fix`, and `NEED_HUMAN` to `human-handoff`.
- Write only concise navigation artifacts: `round-summary.md`, `work-instruction.md`, or `human-handoff.md`.
- Preserve legacy `.agent` review rendering compatibility.
