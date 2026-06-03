# Planning Evidence

Issue #17, issue #15, issue #14, and the previous completion audit were reviewed before implementation. This phase targets the missing proof that starter setup actually initializes an Aegis runtime in a real target directory.

The implementation plan is:

- Add a Windows PowerShell smoke test for `24hagent-starter/setup.ps1`.
- Run setup in a temporary target project with `-NoClaude` and `-SkipReadiness`.
- Verify the generated `.aegis/` layout and installed Claude Code skills.
- Verify old `.agent` onboarding state is absent.
