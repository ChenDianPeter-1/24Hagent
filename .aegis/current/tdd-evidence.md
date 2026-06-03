# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers forbidden action detection and explicit prohibition statements.
- `tests/aegis-runtime.test.ts` now covers file-scope violation hard blocks and human handoff.
- `tests/aegis-runtime.test.ts` now covers forbidden commands in work instructions.
- `tests/aegis-runtime.test.ts` now covers PASS-only commit suggestion rendering.
- Existing `round:check` tests now verify safety runs before task quality, discipline, validation, and Codex prompt readiness.

These tests define the behavior that the implementation must satisfy.
