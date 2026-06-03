# Planning Evidence

Issue #14, the product decisions, and the runtime spec were reviewed before implementation. This phase targets the missing `PASS -> archive round` behavior.

The implementation plan is:

- Add a deterministic archive helper under the Aegis runtime.
- Copy current task, round summary, evidence, reports, Codex artifacts, and Superpower summaries when present.
- Write a compact archive manifest for recovery.
- Attach archival to PASS progression before next-task selection or ask-mode stop.
- Keep `.aegis/archive/` ignored according to the existing Git policy.
