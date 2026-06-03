# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/cli-smoke.test.ts` now covers default `aegis` continuing `need-fix` into `waiting-for-construction`.
- `tests/cli-smoke.test.ts` now proves the bounded Codex repair instruction is not clobbered.
- `tests/cli-smoke.test.ts` now covers default `aegis` continuing `passed` into `ready-for-task`.
- `tests/aegis-controller.test.ts` is rerun to guard existing phase routing.

These tests define the behavior that the implementation must satisfy.
