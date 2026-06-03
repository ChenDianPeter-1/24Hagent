# Planning Evidence

Issue #14 and the current runtime were reviewed before implementation. This phase targets A6 / Phase 6: formal current-task generation from the confirmed blueprint.

The implementation plan is:

- Add a current-task renderer/generator in the Aegis runtime.
- Add `aegis task:next` to write `.aegis/current/current-task.md` from the confirmed blueprint.
- Update high-risk task quality behavior so explicit human permission is required before construction.
- Cover generated task markdown, high-risk permission, and CLI generation with tests.
- Keep Aegis as task selector and gatekeeper; Claude Code still performs construction.
