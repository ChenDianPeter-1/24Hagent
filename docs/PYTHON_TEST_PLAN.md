# Aegis Python Validation Plan

Use this checklist when changing Python detection, validation, starter setup, or
coverage behavior.

## Test Fixture

Create a temporary Python target project:

```bash
mkdir test-python-project
cd test-python-project
git init
mkdir src tests
```

`pyproject.toml`:

```toml
[project]
name = "test-python-project"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-cov>=5.0", "ruff>=0.3", "mypy>=1.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 100

[tool.mypy]
strict = true
```

Example source and test:

```bash
echo 'def add(a: int, b: int) -> int: return a + b' > src/calc.py
cat > tests/test_calc.py << 'EOF'
from src.calc import add

def test_add() -> None:
    assert add(1, 2) == 3
EOF
```

Install tools:

```bash
pip install pytest pytest-cov ruff mypy
```

## Checks

### T1. Starter Setup Creates Aegis Runtime

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 24hagent-starter/Start.ps1 -NoClaude -SkipReadiness
```

Expected:

- `.aegis/config/quality-gates.json`
- `.aegis/config/codex-rubric.md`
- `.aegis/current/next-claude-install-prompt.md`
- `.aegis/state/run-state.json`
- `.claude/skills/aegis-install/SKILL.md`
- `.claude/skills/superpower/SKILL.md`
- no old `.agent` onboarding directory

### T2. Readiness Detects Python Project

```bash
aegis readiness
```

Expected:

- no crash when `package.json` is absent
- Python project signals are recognized
- report is written to `.aegis/current/quality-readiness-report.md`
- missing Python tools produce `BLOCKED` with Python-specific next steps

### T3. Validate Plan Uses Python Gates

```bash
aegis validate:plan
```

Expected:

- `test` gate uses `pytest`
- `lint` gate uses `ruff check .` or the configured Python linter
- `typecheck` gate uses `mypy src/` or the configured Python typechecker
- `coverage` gate uses `pytest --cov --cov-report=json`

### T4. Validate Executes Python Gates

```bash
aegis validate
```

Expected:

- report is written to `.aegis/current/validation-report.md`
- each enabled gate records command, exit code, status, and raw output
- coverage.py JSON is parsed without `PARSE_FAILED`
- thresholds are evaluated correctly

### T5. Coverage.py Metrics

Run:

```bash
pytest --cov --cov-report=json
aegis validate
```

Expected:

- `lines` and `statements` are evaluated
- `functions: null` does not block
- `branches: null` does not block unless branch coverage is configured
- coverage below threshold blocks validation

### T6. Codex Prompt Readiness

After a bounded task and validation report exist:

```bash
aegis round:check
```

Expected:

- safety, task quality, discipline, and validation gates run first
- Codex prompt is generated only after prerequisites pass
- prompt path is `.aegis/current/codex-review-prompt.md`
- Aegis does not execute Codex

### T7. Regression

From the Aegis repo:

```bash
npm run typecheck
npm run build
npm run lint
npm test
```

Expected:

- all existing Node/Aegis tests pass
- starter smoke test passes
- legacy compatibility tests pass only where compatibility is intentionally kept

## Pass Standard

Python onboarding is considered validated when:

- T1 through T7 pass
- generated runtime state uses `.aegis/`
- old `.agent` onboarding instructions are absent from current docs
- Codex remains read-only
- Aegis does not perform Git or release mutations
