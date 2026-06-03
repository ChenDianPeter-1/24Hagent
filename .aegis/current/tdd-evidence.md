# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers archive creation, copied round artifacts, and manifest contents.
- `tests/cli-smoke.test.ts` now verifies real default `aegis` PASS progression writes archive manifests in both `auto` and `ask` modes.
- Existing progression tests continue to verify `auto`, `allow`, `ask`, and repair-limit behavior while archival is attached.

These tests define the behavior that the implementation must satisfy.
