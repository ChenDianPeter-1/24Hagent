# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers formal current-task generation from blueprint content.
- `tests/cli-smoke.test.ts` now covers `aegis task:next` writing a reviewable current task.
- `tests/cli-smoke.test.ts` now proves the generated task passes `aegis task:review`.
- `tests/task-quality-gate.test.ts` now covers explicit human permission for high-risk file scope.

These tests define the behavior that the implementation must satisfy.
