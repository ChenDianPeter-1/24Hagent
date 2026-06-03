# TDD Evidence

Tests were added or adjusted before validating the implementation behavior:

- `tests/review-cli.test.ts` now covers `PASS` routing into `passed` state.
- `tests/review-cli.test.ts` now covers `NEED_FIX` routing into bounded repair instructions.
- `tests/review-cli.test.ts` now covers `NEED_HUMAN` routing into a human handoff packet.
- Existing review result and renderer tests are rerun to guard parser and Markdown compatibility.

These tests define the behavior that the implementation must satisfy.
