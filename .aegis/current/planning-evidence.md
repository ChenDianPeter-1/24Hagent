# Planning Evidence

Issue #15, issue #14, the product decisions, and the previous completion audit were reviewed before implementation. This phase targets the bundled starter that still taught old 24Hagent / `.agent` onboarding.

The implementation plan is:

- Replace starter onboarding identity with Aegis-first wording.
- Replace `24hagent-install` with `aegis-install`.
- Change setup scripts to create `.aegis/` runtime files and generated install prompt.
- Replace old starter Orchestrator protocol with the Aegis Claude Code hosting protocol.
- Keep CLI compatibility/fallback references explicit instead of hiding them.
