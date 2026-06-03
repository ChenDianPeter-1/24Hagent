# Planning Evidence

Issue #14, the product decisions, and the MVP roadmap were reviewed before implementation. This phase targets Phase 9: Auto / Allow / Ask progression.

The implementation plan is:

- Add a progression policy module for mode-aware post-verdict transitions.
- Keep the default `auto` path deterministic and non-interactive.
- Make `ask` stop by writing `decision-request.md`.
- Make `allow` lower interruption while still respecting round and repair limits.
- Add navigation output that explains the mode decision.
