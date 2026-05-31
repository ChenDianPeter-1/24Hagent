# 24hagent 启动 Python 项目 —— 保姆级教学

从零开始，把一个 Python 项目接入 24hagent 自动编排循环。

---

## 前提：你的角色

你是 **HUMAN（项目老板）**。你只需做两件事：
1. 按本文档配好环境（一次性）
2. 写 `PROJECT_BLUEPRINT.md` 描述你的项目目标（一次性）

之后 Claude Code 的 Orchestrator 会自动拆任务、执行、验证、调 Codex 审查。

---

## 第 0 步：确认前置工具链

在命令行依次运行，确认全部可用：

```bash
# 1. Node.js（24hagent 自身的运行时）
node --version          # 需要 >= 20

# 2. Python（目标项目的运行时 + 24hagent 用它解析 pyproject.toml）
python --version        # 需要 >= 3.11（3.11+ 有 tomllib）

# 3. Codex CLI（外部审查官）
codex --version         # 需要 >= 0.134

# 4. Git
git --version           # 任意版本
```

任何一条报错 → 先装好再继续。

---

## 第 1 步：准备你的 Python 项目

如果你的 Python 项目还没有标准结构，按这个模板来：

```bash
your-project/
├── pyproject.toml        # 项目元数据 + 依赖声明（必须）
├── src/                  # 源码
│   └── your_module/
│       └── __init__.py
├── tests/                # 测试
│   └── test_your_module.py
└── .git/                 # git 仓库（必须）
```

### 1a. pyproject.toml 模板

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

**关键点**：`dev` 依赖组里必须声明 pytest、pytest-cov、ruff、mypy。24hagent 用这些来检测工具链。

### 1b. 安装依赖

```bash
pip install pytest pytest-cov ruff mypy
# 或
uv add --dev pytest pytest-cov ruff mypy
```

### 1c. 验证工具链可用

```bash
pytest --version        # 应输出版本号
ruff --version          # 应输出版本号
mypy --version          # 应输出版本号
pytest --cov --cov-report=json  # 应正常运行（可能0个测试，没关系）
```

---

## 第 2 步：克隆 24hagent 到本地

```bash
cd /path/to
git clone <24hagent-repo-url> 24hagent
cd 24hagent
npm install
npm run build
```

验证 24hagent 自身可用：

```bash
node dist/cli/main.js readiness
# 应输出 Verdict: **READY** 或 Verdict: **NEEDS_CONFIG** 或 Verdict: **BLOCKED**
# 只要不 crash 就行
```

---

## 第 3 步：初始化 .agent 工作区

在你的 Python 项目根目录下：

```bash
cd /path/to/your-project

# 创建 .agent 目录
mkdir -p .agent
```

### 3a. 复制质量门模板

```bash
cp /path/to/24hagent/24hagent-starter/.agent/QUALITY_GATES.json .agent/
```

编辑 `.agent/QUALITY_GATES.json`，把命令改成 Python 的：

```json
{
  "gates": {
    "test": {
      "enabled": true,
      "command": "pytest",
      "blocking": true,
      "description": "Run pytest"
    },
    "lint": {
      "enabled": true,
      "command": "ruff check src/ tests/",
      "blocking": true,
      "description": "Run ruff linter"
    },
    "typecheck": {
      "enabled": true,
      "command": "mypy src/",
      "blocking": true,
      "description": "Run mypy type checker"
    },
    "coverage": {
      "enabled": true,
      "command": "pytest --cov=src --cov-report=json",
      "blocking": true,
      "description": "Run tests with coverage",
      "profile": "coverage_py",
      "threshold": {
        "lines": 100,
        "branches": null,
        "functions": null,
        "statements": 100
      }
    }
  }
}
```

**注意**：`branches` 和 `functions` 设为 `null`——coverage.py 不提供函数覆盖率，null 表示跳过该指标。

### 3b. 复制审查标准模板

```bash
cp /path/to/24hagent/24hagent-starter/.agent/CODEX_REVIEW_RUBRIC.md .agent/
```

### 3c. 写项目蓝图

创建 `.agent/PROJECT_BLUEPRINT.md`：

```markdown
# Project Blueprint

## Project Goal
一句话描述你的项目目标。例如：一个 FastAPI 后端服务，提供用户认证和 CRUD API。

## MVP Scope

### In Scope
- 用户注册/登录 API
- 数据模型的 CRUD 操作
- API 文档（OpenAPI）

### Out of Scope
- 前端界面
- 邮件通知
- 第三方登录

## Technical Boundaries
- 语言：Python 3.11+
- 框架：FastAPI + SQLAlchemy + Pydantic v2
- 数据库：SQLite（开发）/ PostgreSQL（生产）
- 测试：pytest + pytest-cov（覆盖率 >= 90%）
- Lint：ruff
- 类型检查：mypy --strict

## Prohibited Actions
- 不要在代码中硬编码密钥/token
- 不要用 print 替代 logging
- 不要跳过类型注解
- 不要使用 eval/exec
- 不要 suppress linter/type 错误（# noqa, # type: ignore 需注释原因）
```

---

## 第 4 步：跑就绪检查

```bash
cd /path/to/24hagent
npm run build && node dist/cli/main.js readiness
```

**三种输出**：

| 输出 | 含义 | 动作 |
|------|------|------|
| `Verdict: **READY**` | 工具链就绪 | 进入第5步 |
| `Verdict: **NEEDS_CONFIG**` | 门命令不匹配 | 检查 `.agent/QUALITY_GATES.json` 的命令是否可执行 |
| `Verdict: **BLOCKED**` | 工具链缺失 | 看 `.agent/QUALITY_READINESS_REPORT.md` 的 Blocking Issues，装好工具再跑 |

**BLOCKED 时不要跳过——硬质量门是 24hagent 的核心价值，跳过等于自废武功。**

---

## 第 5 步：启动 Orchestrator

打开 Claude Code，复制以下提示词：

```text
请严格按照 CLAUDE.md 和 CLAUDE_ORCHESTRATOR_PROTOCOL.md 执行。

你现在进入 Claude-side Orchestrator 模式。

你需要读取以下文件：
- CLAUDE.md
- CLAUDE_ORCHESTRATOR_PROTOCOL.md
- .agent/PROJECT_BLUEPRINT.md
- .agent/PROJECT_STATE.md
- .agent/RUN_STATE.json
- .agent/TASK_QUEUE.md
- .agent/QUALITY_GATES.json

你的运行规则：
1. 每次只从 TASK_QUEUE.md 中选一个 pending 任务，写入 .agent/CURRENT_TASK.md。
2. 作为 Worker，严格按照 CURRENT_TASK.md 的 spec、file_scope 和 DoD 执行。
3. Worker 不得修改 file_scope 之外的文件，不得自行扩大范围。
4. Worker 执行完成后，必须写 .agent/WORK_REPORT.md。
5. 然后必须以 Orchestrator 身份运行本地质量门：
   node dist/cli/main.js validate
   如果任何 blocking gate 失败，回到步骤 2 返修（retry_count + 1）。
6. 本地验证通过后，运行 Codex 对抗性审查：
   node dist/cli/main.js review:prompt
   然后将生成的 prompt 发送给 codex exec --sandbox read-only --json
   最后用 node dist/cli/main.js review:render 解析审查结果
7. 读取 .agent/CODEX_REVIEW.md 中的 verdict：
   - PASS → 标记任务 done，更新 PROJECT_STATE.md 和 RUN_STATE.json，进入下一个任务。
   - NEED_FIX → 读取 required_fixes，创建返修任务，retry_count + 1。
     同一任务最多 2 次返修（共 3 次尝试）。超过则写 .agent/HUMAN_HANDOFF.md 并停止。
   - NEED_HUMAN → 立即写 .agent/HUMAN_HANDOFF.md 并停止。
8. TDD + 100% coverage 是 MVP 硬质量门。
9. Python 项目特别规则：
   - 使用 pytest 而非 npm test
   - 使用 ruff check 而非 eslint
   - 使用 mypy 而非 tsc
   - 覆盖率用 pytest --cov --cov-report=json
   - coverage.py 不提供函数覆盖率——functions threshold 为 null 时自动跳过
   - 禁止使用 # noqa、# type: ignore 跳过 lint/类型检查（除非有注释说明原因）
10. 阶段完成后执行 git commit（不 push，不 merge）。
11. 绝对禁止：
    - 自动 push 到远程仓库
    - 自动 merge 分支
    - 删除文件（除非人类明确批准）
    - 修改密钥、凭证、token
    - 安装/卸载依赖（除非人类明确批准）
    - 遇到 NEED_HUMAN 后继续执行
    - Codex 未 PASS 就进入下一个任务

现在开始：读取上述所有文件，判断当前状态，然后按协议运行。
```

---

## 第 6 步：人类只在出现 HUMAN_HANDOFF.md 时介入

正常情况下，Orchestrator 会自动循环：

```
选任务 → 写 CURRENT_TASK.md
       → Worker TDD 实现 → 写 WORK_REPORT.md
       → Orchestrator 独立跑 pytest + ruff + mypy + coverage
       → Codex 审查
       → PASS 继续 / NEED_FIX 返修 / NEED_HUMAN 停机
       → git commit
```

你只会在以下情况被叫到：
- `.agent/HUMAN_HANDOFF.md` 出现（安全停机）
- 某个任务返修 2 次还没过
- Codex 返回 NEED_HUMAN

---

## 常见问题

### Q: 我的项目用 flake8 而不是 ruff 怎么办？

改 `.agent/QUALITY_GATES.json` 的 lint 命令为 `flake8 src/`。24hagent 检测到 flake8 在依赖中时会自动适配。

### Q: 我不想用 mypy，用 pyright 可以吗？

可以。改 QUALITY_GATES.json 的 typecheck 命令为 `pyright src/`。检测逻辑支持 mypy/pyright/pytype。

### Q: 覆盖率 100% 太严格了，能降低吗？

改 `.agent/QUALITY_GATES.json` 的 coverage.threshold。但要注意——这是 MVP 默认硬门，降低阈值意味着接受未测试的代码进入仓库。

### Q: 我的项目还没有测试怎么办？

先写。24hagent 的 TDD 流程要求先写失败测试再实现。如果你连测试框架都没装，readiness 会返回 BLOCKED 并告诉你装什么。

### Q: 我有一个已有的 Python 项目，怎么接入？

从第 1 步开始：确认有 pyproject.toml + pytest/ruff/mypy/coverage 依赖。然后跳到第 3 步初始化 .agent。

---

## 一页纸速查

```
0. 确认工具链：node, python, codex, git 全可用
1. 准备项目：pyproject.toml 声明 pytest/ruff/mypy/pytest-cov
2. 装依赖：pip install pytest ruff mypy pytest-cov
3. 初始化：创建 .agent/QUALITY_GATES.json（Python版）+ PROJECT_BLUEPRINT.md
4. 就绪检查：npm run build && node dist/cli/main.js readiness → READY
5. 复制启动提示词到 Claude Code → 自动循环开始
6. 只在 HUMAN_HANDOFF.md 出现时介入
```
