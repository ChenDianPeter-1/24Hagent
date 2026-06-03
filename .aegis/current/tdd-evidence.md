# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers blueprint draft and summary runtime paths.
- `tests/aegis-runtime.test.ts` now covers blueprint summary rendering for human confirmation.
- `tests/cli-smoke.test.ts` now covers `aegis blueprint:start`.
- `tests/cli-smoke.test.ts` now covers `aegis blueprint:summary` writing a decision request and entering `decision-request`.
- `tests/cli-smoke.test.ts` now covers `aegis blueprint:confirm` promoting the draft and entering `ready-for-task`.

These tests define the behavior that the implementation must satisfy.
