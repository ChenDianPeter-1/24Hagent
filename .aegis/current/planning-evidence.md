# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets A9: quality gates and Codex read-only external review loop hardening.

The implementation plan is:

- Add a single `round:check` path that runs task quality, Superpower discipline, local validation, and Codex prompt readiness in order.
- Reuse existing Aegis paths and ignored current-round report files instead of adding new tracked runtime artifacts.
- Preserve the boundary that Aegis generates the Codex prompt but does not execute Codex itself.
- Add focused tests for success, task-quality failure, discipline failure, local validation failure, and Codex verdict routing.
- Update runtime spec and roadmap so the loop is documented as the A9 implemented slice.
