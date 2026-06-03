# TDD Evidence

Validation checks planned for this starter migration phase:

- Search starter files for old product terms and verify remaining hits are compatibility, generated fallback, or absence-check references.
- Run the starter layout test to prove the packaged skill and setup docs route through Aegis.
- Rebuild the bundled starter CLI to produce `bin/aegis.mjs`.
- Run the normal TypeScript build and test suite to ensure starter packaging changes do not disturb runtime behavior.
- Run Aegis safety and task quality checks before commit.

This phase updates starter packaging and tests, not the core runtime state machine.
