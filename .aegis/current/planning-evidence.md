# Planning Evidence

Issue #14 was reviewed before implementation. The planned phase is intentionally broad enough to cover product docs, the evidence model, controller routing, current task synchronization, and focused tests in one commit boundary.

The implementation plan is:

- Keep `superpower:scan` as source availability only.
- Make `discipline:check` consume current-round evidence files from `.aegis/current/`.
- Require planning, verification, and review evidence for completed rounds.
- Require TDD or test-first evidence for feature-style work.
- Require systematic debugging evidence for bug-fix work.
- Prevent the controller from continuing to Codex review unless the discipline report has `Verdict: PASS`.
