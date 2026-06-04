#!/bin/bash
set -euo pipefail

SKIP_READINESS=false
NO_CLAUDE=false

for arg in "$@"; do
  case "$arg" in
    --skip-readiness|--skip) SKIP_READINESS=true ;;
    --no-claude) NO_CLAUDE=true ;;
    *) echo "[ERROR] Unknown argument: $arg"; exit 1 ;;
  esac
done

STARTER_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(pwd)"
BIN="$STARTER_DIR/bin/aegis.mjs"

if [ ! -f "$BIN" ]; then
  echo "[ERROR] Aegis CLI was not found: $BIN"
  echo "Run this in the Aegis repository first: npm run build:starter"
  exit 1
fi

echo "Aegis Starter"
echo "============="
echo "Project root: $PROJECT_ROOT"

echo ""
echo "1. Detecting project signals"
PROJECT_TYPE="unknown"
if [ -f "package.json" ]; then
  PROJECT_TYPE="node"
  echo "[OK] Detected Node.js project."
elif [ -f "pyproject.toml" ]; then
  PROJECT_TYPE="python"
  echo "[OK] Detected Python project."
elif find . -maxdepth 2 -name "*.py" -print -quit | grep -q . || [ -f "requirements.txt" ]; then
  PROJECT_TYPE="python"
  echo "[WARN] Found Python evidence but no pyproject.toml. Creating a minimal pyproject.toml."
  cat > pyproject.toml << TOMLEOF
[project]
name = "$(basename "$PROJECT_ROOT")"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "mypy"]
TOMLEOF
  echo "[OK] pyproject.toml created."
else
  echo "[WARN] No package.json, pyproject.toml, requirements.txt, or shallow Python files were found."
  echo "[WARN] Project type is unknown. Aegis will defer stack selection to Claude onboarding."
fi

echo ""
echo "2. Creating runtime directories"
mkdir -p .aegis/config .aegis/blueprint .aegis/current .aegis/state .claude/skills
echo "[OK] .aegis/"
echo "[OK] .claude/skills/"

echo ""
echo "3. Installing Claude Code skills"
mkdir -p .claude/skills/superpower .claude/skills/aegis-install
cp -R "$STARTER_DIR/.claude/skills/superpower/." .claude/skills/superpower/
cp -R "$STARTER_DIR/.claude/skills/aegis-install/." .claude/skills/aegis-install/
echo "[OK] .claude/skills/superpower/"
echo "[OK] .claude/skills/aegis-install/"

echo ""
echo "4. Creating quality gates"
if [ ! -f ".aegis/config/quality-gates.json" ]; then
  if [ "$PROJECT_TYPE" = "python" ]; then
    cat > .aegis/config/quality-gates.json << 'JSONEOF'
{
  "project_type": "python",
  "tdd_required": true,
  "gates": {
    "test": { "enabled": true, "command": "pytest", "blocking": true, "description": "Run pytest" },
    "lint": { "enabled": true, "command": "ruff check .", "blocking": true, "description": "Run ruff linter" },
    "typecheck": { "enabled": true, "command": "mypy src/", "blocking": true, "description": "Run mypy type checker" },
    "coverage": {
      "enabled": true,
      "command": "pytest --cov --cov-report=json",
      "blocking": true,
      "threshold": { "lines": 100, "branches": null, "functions": null, "statements": 100 },
      "description": "Tests with coverage"
    }
  }
}
JSONEOF
  elif [ "$PROJECT_TYPE" = "node" ]; then
    cat > .aegis/config/quality-gates.json << 'JSONEOF'
{
  "project_type": "node",
  "tdd_required": true,
  "gates": {
    "test": { "enabled": true, "command": "npm run test", "blocking": true, "description": "Run tests" },
    "lint": { "enabled": true, "command": "npm run lint", "blocking": true, "description": "Run linter" },
    "typecheck": { "enabled": true, "command": "npm run typecheck", "blocking": true, "description": "Run type checker" },
    "coverage": {
      "enabled": true,
      "command": "npm run coverage",
      "blocking": true,
      "threshold": { "lines": 100, "branches": 100, "functions": 100, "statements": 100 },
      "description": "Coverage"
    }
  }
}
JSONEOF
  else
    cat > .aegis/config/quality-gates.json << 'JSONEOF'
{
  "project_type": "unknown",
  "tdd_required": true,
  "gates": {
    "test": {
      "enabled": false,
      "command": "",
      "blocking": true,
      "description": "NEEDS_CONFIG: clarify project stack first during Claude onboarding"
    },
    "lint": {
      "enabled": false,
      "command": "",
      "blocking": true,
      "description": "NEEDS_CONFIG: clarify project stack first during Claude onboarding"
    },
    "typecheck": {
      "enabled": false,
      "command": "",
      "blocking": true,
      "description": "NEEDS_CONFIG: clarify project stack first during Claude onboarding"
    },
    "coverage": {
      "enabled": false,
      "command": "",
      "blocking": true,
      "threshold": { "lines": 100, "branches": 100, "functions": 100, "statements": 100 },
      "description": "NEEDS_CONFIG: clarify project stack first during Claude onboarding"
    }
  }
}
JSONEOF
  fi
  echo "[OK] .aegis/config/quality-gates.json created."
else
  echo "[SKIP] .aegis/config/quality-gates.json already exists."
fi

echo ""
echo "5. Copying Aegis runtime helpers"
for item in "scripts/check_quality_readiness.ps1" "scripts/validate_task.ps1" "scripts/codex_review.ps1" "CLAUDE_ORCHESTRATOR_PROTOCOL.md" "START_ORCHESTRATOR.md"; do
  if [ ! -f "$item" ] && [ -f "$STARTER_DIR/$item" ]; then
    mkdir -p "$(dirname "$item")"
    cp "$STARTER_DIR/$item" "$item"
    echo "[OK] $item"
  else
    echo "[SKIP] $item already exists or source is missing."
  fi
done

if [ ! -f ".aegis/config/codex-rubric.md" ] && [ -f "$STARTER_DIR/.aegis/config/codex-rubric.md" ]; then
  cp "$STARTER_DIR/.aegis/config/codex-rubric.md" .aegis/config/codex-rubric.md
  echo "[OK] .aegis/config/codex-rubric.md"
fi

if [ ! -f ".aegis/state/run-state.json" ]; then
  cat > .aegis/state/run-state.json << JSONEOF
{
  "schema_version": 1,
  "project_id": "$(basename "$PROJECT_ROOT")",
  "task_id": "starter-onboarding",
  "phase": "blueprint-draft",
  "mode": "ask",
  "last_verdict": "starter-installed",
  "round_count": 0,
  "retry_count": 0,
  "updated_at": "$(date +%Y-%m-%dT%H:%M:%S)"
}
JSONEOF
  echo "[OK] .aegis/state/run-state.json created."
fi

echo ""
echo "6. Generating Claude install prompt"
cp "$STARTER_DIR/templates/NEXT_CLAUDE_INSTALL_PROMPT.template.md" .aegis/current/next-claude-install-prompt.md
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < .aegis/current/next-claude-install-prompt.md
  echo "[OK] Install prompt copied to clipboard."
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard < .aegis/current/next-claude-install-prompt.md
  echo "[OK] Install prompt copied to clipboard."
else
  echo "[WARN] Clipboard copy is not available. Open .aegis/current/next-claude-install-prompt.md manually."
fi

echo ""
echo "7. Running readiness check"
if [ "$PROJECT_TYPE" = "unknown" ]; then
  echo "[SKIP] Readiness check skipped because project type is unknown. Claude onboarding will clarify the stack first."
elif [ "$SKIP_READINESS" = false ]; then
  node "$BIN" readiness || echo "[WARN] Readiness found blocking issues. Fix them before starting the Aegis delivery loop."
else
  echo "[SKIP] Readiness check skipped."
fi

echo ""
echo "8. Starting Claude Code"
if [ "$NO_CLAUDE" = true ]; then
  echo "[SKIP] Claude launch skipped."
elif command -v claude >/dev/null 2>&1; then
  echo "[OK] Claude CLI found."
  if claude --help 2>&1 | grep -Eq '\[prompt\]|Arguments:.*prompt'; then
    echo "Launching Claude Code with the install prompt from the project root."
    claude "$(cat .aegis/current/next-claude-install-prompt.md)"
  else
    echo "Launching Claude Code from the project root."
    echo "Your Claude CLI does not advertise prompt injection. Paste .aegis/current/next-claude-install-prompt.md."
    claude
  fi
else
  echo "[WARN] Claude CLI was not found on PATH."
  echo ""
  echo "Aegis setup is complete."
  echo "The install prompt is available at .aegis/current/next-claude-install-prompt.md."
  echo ""
  echo "Next steps:"
  echo "1. Open Claude Code in this project directory."
  echo "2. Paste the prompt from .aegis/current/next-claude-install-prompt.md."
  echo "3. Claude will read .claude/skills/aegis-install/SKILL.md."
  echo "4. The install skill will use .claude/skills/superpower/ for project onboarding."
fi

echo ""
echo "Aegis starter setup finished."
