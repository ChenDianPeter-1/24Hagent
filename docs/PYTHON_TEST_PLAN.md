# Python 适配测试计划

在实施 Python 项目支持的代码改动后，按以下顺序验证。

---

## 测试环境准备

```bash
# 1. 创建一个最小 Python 项目作为测试目标
mkdir /tmp/test-python-project
cd /tmp/test-python-project
git init

# 2. 写一个简单的 pyproject.toml
cat > pyproject.toml << 'EOF'
[project]
name = "test-project"
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
EOF

# 3. 创建最小源码和测试
mkdir src tests
echo 'def add(a, b): return a + b' > src/calc.py
cat > tests/test_calc.py << 'EOF'
from src.calc import add
def test_add():
    assert add(1, 2) == 3
EOF

# 4. 安装依赖
pip install pytest pytest-cov ruff mypy
```

---

## 测试清单

### T1. readiness 命令 — 检测 Python 项目

**命令**：
```bash
cd /path/to/24hagent
npm run build && node dist/cli/main.js readiness
```

**预期结果**：
- 输出 `Verdict: **READY**` 或 `Verdict: **NEEDS_CONFIG**`
- 不应报 "package.json not found"
- 生成的 `.agent/QUALITY_READINESS_REPORT.md` 应包含：
  - `Project Types: python`
  - `Test Runner: pytest`
  - `Linter: ruff`
  - `Typechecker: mypy`
  - `Coverage Tool: pytest-cov`

**失败条件**：
- 报错退出（exit code 1 且是 crash 不是 BLOCKED）
- 识别为 node 项目
- 工具链全部显示 unknown

---

### T2. readiness 命令 — 工具链缺失时 BLOCKED

**准备**：在没有安装 pytest 的环境中（或用空白 pyproject.toml）

**命令**：同上

**预期结果**：
- `Verdict: **BLOCKED**`
- `.agent/QUALITY_READINESS_REPORT.md` 的 Next Steps 应包含 Python 建议：
  - `pip install pytest ruff mypy coverage`
  - 不应出现 `npm install --save-dev vitest`

---

### T3. validate:plan 命令 — 预览质量门

**准备**：确保 `.agent/QUALITY_GATES.json` 存在（可用 Python 默认配置）

**命令**：
```bash
node dist/cli/main.js validate:plan
```

**预期结果**：
- 输出4个gate的执行计划（test/lint/typecheck/coverage）
- 命令应是 Python 系的（如 `pytest`, `ruff check .`），不是 npm 系的
- 如果有 gate disabled，显示 SKIPPED

---

### T4. validate 命令 — 真实执行质量门

**命令**：
```bash
node dist/cli/main.js validate
```

**预期结果**：
- 4个gate依次执行
- `.agent/VALIDATION_REPORT.md` 包含每个gate的 exit code 和状态
- coverage gate 应成功解析 coverage.py JSON 输出（不是 PARSE_FAILED）
- 如果所有测试通过、覆盖率100%，Overall: PASS

**失败条件**：
- coverage gate 报告 PARSE_FAILED
- 任何gate报告 UNAVAILABLE（命令找不到）
- validate 本身 crash

---

### T5. coverage 解析 — coverage.py JSON 格式

**子测试 5a：100% 覆盖率**

```bash
# 确保测试全通过 + 覆盖率100%
pytest --cov=src --cov-report=json
node dist/cli/main.js validate
```

**预期**：`.agent/VALIDATION_REPORT.md` 中 Coverage Detail 显示 lines=100%, statements=100%

**子测试 5b：覆盖率不足**

```python
# 在 src/calc.py 中加一个未测试的函数
def unused(): return 42
```

**预期**：coverage gate FAIL，threshold not met

**子测试 5c：functions 指标为 null 时正常跳过**

**预期**：Coverage Detail 中 functions 行显示 "N/A" 或不出现在报告中，不阻塞 PASS

---

### T6. review:prompt 命令 — 生成审查 prompt

**命令**：
```bash
# 先做一些改动
echo "" >> src/calc.py
git add -A
node dist/cli/main.js review:prompt
```

**预期结果**：
- 生成 `.agent/codex-review-prompt.md`
- 包含 git diff、任务 spec 等
- 不应报错

---

### T7. 回归测试 — 确保未破坏 JS/TS 项目支持

**命令**：
```bash
npm test
```

**预期**：所有现有测试通过（15个测试文件，覆盖 readiness-engine、validation-engine、command-runner、schemas 等）

---

### T8. 边缘情况

| 场景 | 命令 | 预期 |
|------|------|------|
| 项目目录无任何项目文件 | readiness | BLOCKED + 明确提示"未找到 package.json 或 pyproject.toml" |
| pyproject.toml 存在但无 [project] 段 | readiness | 降级为低置信度检测，尝试从 [tool.*] 推断 |
| Python 未安装但项目是 Python | readiness | BLOCKED + 明确提示"Python 项目需要 python 命令" |
| coverage 输出为空 | validate | coverage gate FAIL + PARSE_FAILED |
| coverage 输出为终端文本而非 JSON | validate | 尝试解析，失败则 PARSE_FAILED（建议用户加 --cov-report=json） |
| pyproject.toml 语法错误 | readiness | 不 crash，降级为手写解析器或报告 BLOCKED |

---

## 通过标准

全部 T1-T7 通过 + T8 中至少 5/6 场景符合预期 = Python 适配验证完成。
