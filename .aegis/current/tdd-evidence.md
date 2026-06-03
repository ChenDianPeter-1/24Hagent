# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/aegis-runtime.test.ts` now covers `auto` PASS continuation, `ask` PASS decision requests, `allow` round-limit stops, and repair-limit human handoff.
- `tests/cli-smoke.test.ts` now covers real default `aegis` ask-mode decision request generation after `PASS`.
- Existing CLI smoke coverage still verifies auto-mode `NEED_FIX` and `PASS` transitions.
- Controller/status tests were adjusted for the new `round_count` state field and mode-aware navigation.

These tests define the behavior that the implementation must satisfy.
