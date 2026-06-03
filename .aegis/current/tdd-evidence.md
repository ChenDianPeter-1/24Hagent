# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers the new `claude-code-contract.md` runtime path.
- `tests/cli-smoke.test.ts` now covers `aegis contract` output.
- The CLI smoke asserts the role split in the printed contract.

These tests define the behavior that the implementation must satisfy.
