# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/superpower-sources.test.ts` now covers the difference between source availability and current-round discipline evidence.
- `tests/superpower-cli.test.ts` now proves that `runDisciplineCheck` fails when source scan passes but required evidence files are missing.
- `tests/aegis-controller.test.ts` now proves the controller blocks on a non-PASS discipline report.

These tests define the behavior that the implementation must satisfy.
