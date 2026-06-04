# Python Support Historical Analysis

This document is historical context. It records the old 24Hagent Python support
analysis and the migration decisions that informed Aegis. It is not the current
onboarding guide.

For current instructions, use:

- `docs/PYTHON_QUICKSTART.md`
- `docs/PYTHON_TEST_PLAN.md`
- `docs/HOW_TO_NEW_PROJECT.md`

## Current Aegis Position

Aegis itself remains a TypeScript/Node.js CLI. It can validate Python target
projects because validation gates execute configured shell commands rather than
language-specific logic.

The current runtime is `.aegis/`, not the old runtime directory.

Current Python project support depends on:

- `pyproject.toml` or other Python project signals
- `pytest` for tests
- `ruff`, `flake8`, or another configured linter
- `mypy`, `pyright`, or another configured typechecker
- `pytest-cov` / coverage.py for coverage JSON
- `.aegis/config/quality-gates.json` for gate commands

## Durable Findings From The Old Analysis

These findings remain relevant:

- The command runner is language-agnostic.
- Validation gates should execute configured commands rather than hardcode an ecosystem.
- Python coverage.py does not provide function coverage, so function threshold should be `null`.
- coverage.py JSON should be parsed from `totals.percent_covered` and branch fields only when present.
- Python-specific lint suppression should be reviewed separately from JS/TS suppression.
- Readiness reports must produce Python-specific next steps when Python tools are missing.

## Historical Decisions

The old analysis identified three important migration requirements:

1. Readiness must not require `package.json`.
2. Toolchain detection must understand Python project files and tools.
3. Coverage parsing must support coverage.py and unsupported metrics.

Those requirements should now be verified against the Aegis runtime and tests,
not the old 24Hagent onboarding loop.

## What Is No Longer Current

The following old assumptions are obsolete:

- new projects should initialize the old runtime directory
- users should copy quality-gate files from the old starter runtime directory
- Claude Code should enter the old pre-Aegis loop
- Python onboarding should teach the old command identity as the primary command

New work should use Aegis terminology, `.aegis/` runtime paths, and `aegis`
commands.

## Current Follow-Up Work

Useful future checks:

- audit remaining compatibility fallback paths in source and tests
- decide which old fixtures must remain for compatibility coverage
- expand Python-specific readiness tests if gaps are found
- verify a real Python fixture with `aegis readiness`, `aegis validate:plan`,
  and `aegis validate`
