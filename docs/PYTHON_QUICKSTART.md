# Aegis Python Quickstart

Use this guide to onboard a Python project into Aegis.

Aegis is hosted by Claude Code. Claude Code performs construction. Aegis owns
state, task slices, evidence, local gates, Codex review packets, verdict
routing, and safety boundaries.

## Prerequisites

Install or confirm:

```bash
node --version
python --version
git --version
```

Recommended Python tools:

```bash
pip install pytest pytest-cov ruff mypy
```

Codex CLI is optional but recommended for read-only review:

```bash
codex --version
```

## Python Project Shape

Aegis works best when the target project has:

```text
your-project/
  pyproject.toml
  src/
  tests/
  .git/
```

Minimal `pyproject.toml`:

```toml
[project]
name = "your-project"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-cov>=5.0",
  "ruff>=0.3",
  "mypy>=1.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 100

[tool.mypy]
strict = true
```

## Install Aegis Starter

Copy the bundled starter into the target project and run it:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1
```

For setup without launching Claude Code:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1 -NoClaude
```

The starter initializes:

```text
.aegis/config/quality-gates.json
.aegis/config/codex-rubric.md
.aegis/current/next-claude-install-prompt.md
.aegis/state/run-state.json
.claude/skills/aegis-install/
.claude/skills/superpower/
```

It does not create old `.agent` onboarding state.

## Configure Python Gates

For Python projects, `.aegis/config/quality-gates.json` should use commands like:

```json
{
  "project_type": "python",
  "tdd_required": true,
  "gates": {
    "test": {
      "enabled": true,
      "command": "pytest",
      "blocking": true,
      "description": "Run pytest"
    },
    "lint": {
      "enabled": true,
      "command": "ruff check .",
      "blocking": true,
      "description": "Run ruff"
    },
    "typecheck": {
      "enabled": true,
      "command": "mypy src/",
      "blocking": true,
      "description": "Run mypy"
    },
    "coverage": {
      "enabled": true,
      "command": "pytest --cov --cov-report=json",
      "blocking": true,
      "threshold": {
        "lines": 100,
        "branches": null,
        "functions": null,
        "statements": 100
      },
      "description": "Run coverage.py through pytest-cov"
    }
  }
}
```

`functions` is `null` because coverage.py does not provide function coverage.
`branches` can stay `null` unless the project enables branch coverage.

## Start In Claude Code

Open Claude Code in the target project and say:

```text
Use Aegis to start this Python project.
```

Claude Code should read:

```text
.claude/skills/aegis-install/SKILL.md
.aegis/current/next-claude-install-prompt.md
```

Claude Code performs read-only intake first, uses Superpower for clarification,
then writes minimal `.aegis/` onboarding files and asks for confirmation before
construction.

## Main Commands

Run these from the target project:

```bash
aegis
aegis readiness
aegis validate:plan
aegis validate
aegis task:review
aegis round:check
aegis review:prompt
aegis review:render
```

`aegis round:check` is stricter than `npm test` or `pytest`: it checks task
quality, Superpower evidence, local validation, and Codex prompt readiness.

## Safety

Aegis never executes:

- `git commit`
- `git push`
- `git merge`
- `git rebase`
- `git reset --hard`
- dependency installation
- deploy
- release
- publish
- Git history rewrite

Aegis may render commit suggestions after Codex `PASS`, but the human controls
final Git and release actions.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `readiness` reports missing Python tools | Install `pytest`, `pytest-cov`, `ruff`, and `mypy`. |
| Coverage parsing fails | Ensure the command includes `--cov-report=json`. |
| Branch coverage is unavailable | Set `branches` threshold to `null` or enable branch coverage explicitly. |
| You use pyright instead of mypy | Change the `typecheck` command to `pyright src/`. |
| You use flake8 instead of ruff | Change the `lint` command to `flake8 src/ tests/`. |

Do not initialize `.agent/` for new Python onboarding. Use `.aegis/`.
