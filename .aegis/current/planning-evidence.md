# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets A7: automatic navigation file rendering and stale derived-file recovery.

The implementation plan is:

- Add a reusable navigation refresh service in the Aegis runtime.
- Move default `aegis` navigation writes through that service.
- Reuse the service in blueprint and current-task flows.
- Generate decision-request files from the same path when the state requires human input.
- Preserve bounded Codex repair work instructions when explicitly requested.
