# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets the next missing link after Codex verdict routing: default `aegis` must continue from routed verdict states without becoming an autonomous coder.

The implementation plan is:

- Add post-verdict continuation in the default Aegis entrypoint.
- For `need-fix`, move to `waiting-for-construction` and preserve Codex's bounded repair instruction.
- For `passed`, move to `ready-for-task` and clear the current task id.
- Keep Aegis as state router and instruction writer only.
