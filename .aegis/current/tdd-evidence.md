# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers stale navigation recovery.
- `tests/aegis-runtime.test.ts` now covers automatic decision-request rendering.
- `tests/aegis-runtime.test.ts` now covers preserving bounded repair work instructions.
- Existing CLI smoke tests guard default `aegis`, blueprint flow, and task generation behavior after the refactor.

These tests define the behavior that the implementation must satisfy.
