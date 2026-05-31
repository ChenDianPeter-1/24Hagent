#!/bin/bash
# 24Hagent setup — 一键安装到当前项目
# 用法: bash setup.sh          # 完整安装 + 就绪检查
#       bash setup.sh --skip   # 跳过就绪检查

set -e

STARTER_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN="$STARTER_DIR/bin/24hagent.mjs"

if [ ! -f "$BIN" ]; then
    echo "[ERROR] 找不到 $BIN"
    echo "请先运行: npm run build:starter"
    exit 1
fi

echo "24Hagent Setup"
echo "=============="

# Step 1: 检测项目类型（与 readiness.ts 一致：package.json 优先）
IS_PYTHON=false
if [ -f "package.json" ]; then
    IS_PYTHON=false
elif [ -f "pyproject.toml" ]; then
    IS_PYTHON=true
else
    echo "[WARN] 未找到 package.json 或 pyproject.toml"
fi

# Step 2: 创建 .agent 目录
mkdir -p .agent

# Step 3: 生成 QUALITY_GATES.json（如不存在）
GATES_PATH=".agent/QUALITY_GATES.json"
if [ ! -f "$GATES_PATH" ]; then
    if [ "$IS_PYTHON" = true ]; then
        cat > "$GATES_PATH" << 'JSONEOF'
{
  "gates": {
    "test":      { "enabled": true, "command": "pytest",                         "blocking": true, "description": "Run pytest" },
    "lint":      { "enabled": true, "command": "ruff check .",                    "blocking": true, "description": "Run ruff linter" },
    "typecheck": { "enabled": true, "command": "mypy src/",                       "blocking": true, "description": "Run mypy type checker" },
    "coverage":  { "enabled": true, "command": "pytest --cov --cov-report=json",   "blocking": true,
                   "threshold": { "lines": 100, "branches": null, "functions": null, "statements": 100 },
                   "description": "Tests with coverage" }
  }
}
JSONEOF
    else
        cat > "$GATES_PATH" << 'JSONEOF'
{
  "gates": {
    "test":      { "enabled": true, "command": "npm run test",      "blocking": true, "description": "Run tests" },
    "lint":      { "enabled": true, "command": "npm run lint",      "blocking": true, "description": "Run linter" },
    "typecheck": { "enabled": true, "command": "npm run typecheck", "blocking": true, "description": "Run type checker" },
    "coverage":  { "enabled": true, "command": "npm run coverage",  "blocking": true,
                   "threshold": { "lines": 100, "branches": 100, "functions": 100, "statements": 100 },
                   "description": "Coverage" }
  }
}
JSONEOF
    fi
    echo "[OK] .agent/QUALITY_GATES.json ($([ "$IS_PYTHON" = true ] && echo 'Python' || echo 'Node'))"
else
    echo "[SKIP] .agent/QUALITY_GATES.json 已存在"
fi

# Step 4: 复制脚本和协议文档
for item in "scripts/check_quality_readiness.ps1" "scripts/validate_task.ps1" "scripts/codex_review.ps1" "CLAUDE_ORCHESTRATOR_PROTOCOL.md" "START_ORCHESTRATOR.md"; do
    src="$STARTER_DIR/$item"
    if [ ! -f "$item" ] && [ -f "$src" ]; then
        mkdir -p "$(dirname "$item")"
        cp "$src" "$item"
        echo "[OK] $item"
    fi
done
echo "[OK] 脚本和协议文档已复制"

# Step 5: 复制审查标准
RUBRIC_SRC="$STARTER_DIR/.agent/CODEX_REVIEW_RUBRIC.md"
RUBRIC_DST=".agent/CODEX_REVIEW_RUBRIC.md"
if [ ! -f "$RUBRIC_DST" ] && [ -f "$RUBRIC_SRC" ]; then
    cp "$RUBRIC_SRC" "$RUBRIC_DST"
    echo "[OK] .agent/CODEX_REVIEW_RUBRIC.md"
fi

# Step 6: 运行就绪检查
if [ "$1" != "--skip" ]; then
    echo ""
    echo "运行就绪检查..."
    if ! node "$BIN" readiness; then
        echo ""
        echo "工具链未就绪。请根据上方的建议安装缺失工具后重新运行。"
        echo "然后编辑 .agent/PROJECT_BLUEPRINT.md 描述你的项目目标。"
        echo "最后将 START_ORCHESTRATOR.md 中的提示词复制到 Claude Code 启动。"
    fi
fi

echo ""
echo "完成。删除 24hagent-starter/ 文件夹后即可使用。"
