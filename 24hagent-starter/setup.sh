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
BIN="$STARTER_DIR/bin/24hagent.mjs"

if [ ! -f "$BIN" ]; then
  echo "[ERROR] 24Hagent CLI was not found: $BIN"
  echo "Run this in the 24Hagent repository first: npm run build:starter"
  exit 1
fi

echo "24Hagent Starter"
echo "================"
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
  echo "[WARN] Project type is unknown. 24Hagent will defer stack selection to Claude onboarding."
fi

echo ""
echo "2. Creating runtime directories"
mkdir -p .agent .claude/skills
echo "[OK] .agent/"
echo "[OK] .claude/skills/"

echo ""
echo "3. Installing Claude Code skills"
mkdir -p .claude/skills/superpower .claude/skills/24hagent-install
cp -R "$STARTER_DIR/.claude/skills/superpower/." .claude/skills/superpower/
cp -R "$STARTER_DIR/.claude/skills/24hagent-install/." .claude/skills/24hagent-install/
echo "[OK] .claude/skills/superpower/"
echo "[OK] .claude/skills/24hagent-install/"

echo ""
echo "4. Creating quality gates"
if [ ! -f ".agent/QUALITY_GATES.json" ]; then
  if [ "$PROJECT_TYPE" = "python" ]; then
    cat > .agent/QUALITY_GATES.json << 'JSONEOF'
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
    cat > .agent/QUALITY_GATES.json << 'JSONEOF'
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
    cat > .agent/QUALITY_GATES.json << 'JSONEOF'
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
  echo "[OK] .agent/QUALITY_GATES.json created."
else
  echo "[SKIP] .agent/QUALITY_GATES.json already exists."
fi

echo ""
echo "5. Copying 24Hagent runtime helpers"
for item in "scripts/check_quality_readiness.ps1" "scripts/validate_task.ps1" "scripts/codex_review.ps1" "CLAUDE_ORCHESTRATOR_PROTOCOL.md" "START_ORCHESTRATOR.md"; do
  if [ ! -f "$item" ] && [ -f "$STARTER_DIR/$item" ]; then
    mkdir -p "$(dirname "$item")"
    cp "$STARTER_DIR/$item" "$item"
    echo "[OK] $item"
  else
    echo "[SKIP] $item already exists or source is missing."
  fi
done

if [ ! -f ".agent/CODEX_REVIEW_RUBRIC.md" ] && [ -f "$STARTER_DIR/.agent/CODEX_REVIEW_RUBRIC.md" ]; then
  cp "$STARTER_DIR/.agent/CODEX_REVIEW_RUBRIC.md" .agent/CODEX_REVIEW_RUBRIC.md
  echo "[OK] .agent/CODEX_REVIEW_RUBRIC.md"
fi

echo ""
echo "6. Generating Claude install prompt"
cp "$STARTER_DIR/templates/NEXT_CLAUDE_INSTALL_PROMPT.template.md" .agent/NEXT_CLAUDE_INSTALL_PROMPT.md
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < .agent/NEXT_CLAUDE_INSTALL_PROMPT.md
  echo "[OK] Install prompt copied to clipboard."
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard < .agent/NEXT_CLAUDE_INSTALL_PROMPT.md
  echo "[OK] Install prompt copied to clipboard."
else
  echo "[WARN] Clipboard copy is not available. Open .agent/NEXT_CLAUDE_INSTALL_PROMPT.md manually."
fi

echo ""
echo "7. Running readiness check"
if [ "$PROJECT_TYPE" = "unknown" ]; then
  echo "[SKIP] Readiness check skipped because project type is unknown. Claude onboarding will clarify the stack first."
elif [ "$SKIP_READINESS" = false ]; then
  node "$BIN" readiness || echo "[WARN] Readiness found blocking issues. Fix them before starting the orchestrator loop."
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
    claude "$(cat .agent/NEXT_CLAUDE_INSTALL_PROMPT.md)"
  else
    echo "Launching Claude Code from the project root."
    echo "Your Claude CLI does not advertise prompt injection. Paste .agent/NEXT_CLAUDE_INSTALL_PROMPT.md."
    claude
  fi
else
  echo "[WARN] Claude CLI was not found on PATH."
  echo ""
  echo "24Hagent setup is complete."
  echo "The install prompt is available at .agent/NEXT_CLAUDE_INSTALL_PROMPT.md."
  echo ""
  echo "Next steps:"
  echo "1. Open Claude Code in this project directory."
  echo "2. Paste the prompt from .agent/NEXT_CLAUDE_INSTALL_PROMPT.md."
  echo "3. Claude will read .claude/skills/24hagent-install/SKILL.md."
  echo "4. The install skill will use .claude/skills/superpower/ for project onboarding."
fi

echo ""
echo "24Hagent starter setup finished."
