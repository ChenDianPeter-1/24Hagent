# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers successful `round:check` behavior with task quality, discipline, local validation, and Codex prompt readiness.
- `tests/aegis-runtime.test.ts` now covers task-quality failure stopping before validation.
- `tests/aegis-runtime.test.ts` now covers discipline failure stopping before local validation.
- `tests/aegis-runtime.test.ts` now covers local validation failure stopping before Codex prompt generation.
- `tests/aegis-runtime.test.ts` now covers distinct `PASS`, `NEED_FIX`, and `NEED_HUMAN` Codex verdict routing.

These tests define the behavior that the implementation must satisfy.
