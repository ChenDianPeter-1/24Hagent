# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets the explicit Claude Code host contract that issue #14 required after the minimal Aegis controller.

The implementation plan is:

- Add a human-facing contract document under `docs/`.
- Add a runtime contract under `.aegis/config/`.
- Add `aegis contract` to print the runtime contract for Claude Code sessions.
- Update runtime path tests and CLI smoke tests.
- Keep the contract aligned with Aegis as controller, Claude Code as constructor, and Codex as reviewer.
