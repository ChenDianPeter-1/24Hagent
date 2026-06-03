# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets A8: strengthening the Superpower Discipline Gate while preserving the boundary between source availability and current-round evidence.

The implementation plan is:

- Add a structured evidence model with status, summary, requirement reason, and failure issues.
- Keep `superpower:scan` source-only so source availability cannot prove discipline compliance.
- Require category-specific current-round signals for planning, TDD, debugging, verification, and review evidence.
- Reject placeholder, too-short, missing, or category-mismatched required evidence.
- Update focused tests and docs for the A8 acceptance boundary.
