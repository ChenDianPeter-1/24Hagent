# Aegis

[![English](#english) | [中文](#chinese)]

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-202%20passed-success)](.)

---

## English

### What is Aegis?

Aegis is a **delivery gate that lives inside Claude Code**. It does not replace Claude Code, and it does not become another autonomous coding agent.

Think of a construction site:

| Role | Who | Responsibility |
|---|---|---|
| Foreman | You | Set the direction, make high-risk decisions |
| Crew | Claude Code | Understand goals, break down tasks, write code |
| Inspector | Aegis | Check blueprints, run quality gates, package evidence |
| External auditor | Codex | Read-only review, return PASS / NEED_FIX / NEED_HUMAN |

Aegis is the inspector that makes sure every round of work is planned, checked, and reviewed before moving on.

### Why Aegis?

Claude Code is powerful but confident. It can drift from the goal, skip tests, expand scope, and mark its own homework.

Aegis adds a **mechanical verification layer** that Claude Code cannot bypass:

- Every task must pass a **task quality gate** before construction starts.
- Every change must pass **local quality gates** (tests, lint, typecheck, coverage).
- Every round must leave **Superpower discipline evidence** (planning, TDD, debugging).
- Every change is packaged into a **Codex review packet** for an independent second opinion.
- Every outcome is routed: **PASS → next round**, **NEED_FIX → repair**, **NEED_HUMAN → stop and ask**.

Aegis never writes product code, never commits, never pushes, and never calls AI models. It only checks, packages, and routes.

### How It Works

One round of Aegis-governed work:

```text
You: "Use Aegis to start."
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  1. Blueprint                                        │
│     Claude Code uses Superpower to draft a blueprint │
│     Aegis locks it as project-blueprint.md           │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  2. Task Shaping                                     │
│     Aegis extracts the next minimal task             │
│     Writes current-task.md + work-instruction.md     │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  3. Pre-construction Gates                           │
│     aegis task:review    → task quality check        │
│     aegis safety:check   → forbidden action scan     │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  4. Construction                                     │
│     Claude Code builds per current-task.md           │
│     Leaves discipline evidence in .aegis/current/    │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  5. Post-construction Gates                          │
│     aegis discipline:check → evidence completeness   │
│     aegis validate        → test/lint/typecheck/cov  │
│     aegis round:check     → combined pre-Codex gate  │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  6. Codex Review                                     │
│     aegis review:prompt → build evidence packet      │
│     Codex reads, returns PASS/NEED_FIX/NEED_HUMAN    │
│     aegis review:render → human-readable report      │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  7. Verdict Routing                                  │
│     PASS        → archive round, prepare next task   │
│     NEED_FIX    → repair, retry (capped)             │
│     NEED_HUMAN  → write human-handoff.md, stop       │
└─────────────────────────────────────────────────────┘
```

### Quick Start

**In the Aegis project itself:**

```bash
npm ci
npm run build
npm test
```

**To use Aegis in another project:**

```bash
# 1. Copy the starter into your target project
cp -r aegis-starter/ /path/to/your-project/

# 2. Double-click Start.bat (Windows) or run:
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1

# 3. The starter installs .aegis/ runtime state + Superpower skills
# 4. Claude Code takes over onboarding via the aegis-install skill
# 5. Then just say:
#    "Use Aegis to start."
#    "Use Aegis to continue."
```

Requirements: Node.js 20+, Claude CLI on PATH.

### Commands

| Command | Purpose |
|---|---|
| `aegis` | Refresh navigation, advance state until a stop is required |
| `aegis contract` | Print the Claude Code hosting contract |
| `aegis blueprint:start` | Prepare a Superpower-guided blueprint draft |
| `aegis blueprint:summary` | Render blueprint summary + decision request |
| `aegis blueprint:confirm` | Lock the draft as the confirmed project blueprint |
| `aegis task:next` | Generate the next formal current-task.md from blueprint |
| `aegis task:review` | Check current-task quality before construction |
| `aegis superpower:scan` | Record Superpower source file references |
| `aegis discipline:check` | Verify current-round Superpower discipline evidence |
| `aegis validate` | Run local quality gates (test, lint, typecheck, coverage) |
| `aegis round:check` | Combined pre-Codex gate (safety + task + discipline + validate) |
| `aegis review:prompt` | Generate a read-only Codex review prompt packet |
| `aegis review:render` | Render Codex JSONL into a readable review report |
| `aegis review:run` | Full review loop: prompt → Codex → render → route verdict |
| `aegis safety:check` | Hard-block forbidden actions and file-scope violations |
| `aegis commit:suggest` | Render a commit suggestion after Codex PASS |
| `aegis status` | Show current phase, task, mode, and next action |

### Runtime Directory

```text
.aegis/
  config/
    aegis.json              ← Aegis configuration
    quality-gates.json      ← Quality gate definitions
    codex-rubric.md         ← Codex review criteria
    claude-code-contract.md ← Claude Code hosting rules
  blueprint/
    project-blueprint.md    ← Confirmed project blueprint
    project-progress.md     ← Auto-refreshed progress snapshot
  state/
    run-state.json          ← Single machine source of truth
  current/
    current-task.md         ← This round's construction ticket
    status.md               ← Human-readable phase snapshot
    work-instruction.md     ← Next step for Claude Code
    round-summary.md        ← Round completion summary
    decision-request.md     ← Pending decision for human
    human-handoff.md        ← Human intervention required
    *-evidence.md           ← Discipline evidence (planning/TDD/debug/verify)
    validation-report.md    ← Gate execution results
    codex-review-prompt.md  ← Generated Codex review packet
    codex-review.md         ← Rendered review verdict
  archive/
    <task-id>/              ← Completed round snapshots (not in Git)
```

`run-state.json` is the compact machine truth. Navigation files are generated for Claude Code to read. `archive/` is gitignored.

### What Aegis Is Not

- Not a new AI agent platform.
- Not a replacement for Claude Code.
- Not a model runner. Aegis never calls AI models.
- Not an interactive CLI. Aegis is non-interactive.
- Aegis never commits, pushes, merges, rebases, deploys, releases, or publishes.
- Aegis never takes over Superpower's native directory or methodology.

### Verification

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist/cli/main.js safety:check
node dist/cli/main.js task:review
git diff --check
```

### Documentation

| Document | Content |
|---|---|
| [docs/AEGIS_PRODUCT_DECISIONS.md](docs/AEGIS_PRODUCT_DECISIONS.md) | Product positioning and design decisions |
| [docs/AEGIS_RUNTIME_SPEC.md](docs/AEGIS_RUNTIME_SPEC.md) | Runtime directory spec and file contracts |
| [docs/AEGIS_MVP_ROADMAP.md](docs/AEGIS_MVP_ROADMAP.md) | MVP scope and phase roadmap |
| [docs/AEGIS_CLAUDE_CODE_CONTRACT.md](docs/AEGIS_CLAUDE_CODE_CONTRACT.md) | The contract Claude Code must follow |
| [docs/AEGIS_COMPLETION_AUDIT.md](docs/AEGIS_COMPLETION_AUDIT.md) | Rewrite completion audit |
| [docs/AEGIS_LEGACY_REMOVAL.md](docs/AEGIS_LEGACY_REMOVAL.md) | Legacy .agent fallback removal record |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Project handoff and state summary |
| [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md) | Guide for onboarding a new project |
| [aegis-starter/README.md](aegis-starter/README.md) | Starter package documentation |

### License

MIT

---

## 中文

### Aegis 是什么？

Aegis 是**寄生在 Claude Code 里面的交付门禁系统**。它不替代 Claude Code，也不是另一个自主编码 Agent。

把它想象成一个建筑工地：

| 角色 | 谁 | 职责 |
|---|---|---|
| 甲方 | 你 | 定方向，处理高风险决策 |
| 施工队 | Claude Code | 理解目标，拆解任务，写代码 |
| 质检员 | Aegis | 检查任务单，跑质量门，打包审查材料 |
| 外部监理 | Codex | 只读审查，返回 PASS / NEED_FIX / NEED_HUMAN |

Aegis 就是那个质检员，确保每一轮工作都是先计划、再检查、再审查，才能进入下一轮。

### 为什么需要 Aegis？

Claude Code 很强大，但容易过度自信。它会偏离目标、跳过测试、扩大范围、给自己的作业打分。

Aegis 增加了一层 **Claude Code 无法绕过的机械验证层**：

- 每轮任务开工前必须通过**任务质量门**。
- 每次修改必须通过**本地质量门**（测试、lint、类型检查、覆盖率）。
- 每轮施工必须留下 **Superpower 纪律证据**（计划、TDD、调试记录）。
- 每次改动的证据被打包成 **Codex 审查材料**，由独立第二方审查。
- 每种结果都有明确路由：**PASS → 下一轮**，**NEED_FIX → 返修**，**NEED_HUMAN → 停机等你**。

Aegis 永远不写产品代码、不 commit、不 push、不调用 AI 模型。它只做检查、打包和路由。

### 怎么工作

Aegis 驱动下的一轮完整流程：

```text
你："用 Aegis 启动。"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  1. 蓝图                                             │
│     Claude Code 用 Superpower 起草蓝图               │
│     Aegis 锁定为 project-blueprint.md                 │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  2. 塑形                                             │
│     Aegis 从蓝图中拆出下一轮最小任务                  │
│     生成 current-task.md + work-instruction.md       │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  3. 开工前检查                                       │
│     aegis task:review    → 任务单质量检查            │
│     aegis safety:check   → 禁区动作扫描              │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  4. 施工                                             │
│     Claude Code 按 current-task.md 改代码            │
│     在 .aegis/current/ 留下施工证据                  │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  5. 验收                                             │
│     aegis discipline:check → 施工纪律证据检查        │
│     aegis validate        → 测试/lint/类型/覆盖率    │
│     aegis round:check     → 送审前综合门禁           │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  6. 送审                                             │
│     aegis review:prompt → 生成送审材料包             │
│     Codex 只读审查，返回 PASS/NEED_FIX/NEED_HUMAN    │
│     aegis review:render → 可读审查报告               │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  7. 裁决                                             │
│     PASS        → 归档本轮，准备下一任务             │
│     NEED_FIX    → 返修（有次数上限）                 │
│     NEED_HUMAN  → 写 human-handoff.md，停机等你      │
└─────────────────────────────────────────────────────┘
```

### 快速开始

**在 Aegis 项目本身：**

```bash
npm ci
npm run build
npm test
```

**在其他项目中使用 Aegis：**

```bash
# 1. 把 starter 复制到目标项目
cp -r aegis-starter/ /path/to/your-project/

# 2. 双击 Start.bat（Windows）或运行：
powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1

# 3. Starter 自动安装 .aegis/ 运行态 + Superpower 技能套装
# 4. Claude Code 通过 aegis-install 技能接手引导
# 5. 之后你只需要说：
#    "用 Aegis 启动。"
#    "用 Aegis 继续。"
```

前置要求：Node.js 20+，Claude CLI 在 PATH 中。

### 命令参考

| 命令 | 用途 |
|---|---|
| `aegis` | 刷新导航文件，推进状态直到需要停下来 |
| `aegis contract` | 打印 Claude Code 托管协议 |
| `aegis blueprint:start` | 准备 Superpower 引导的蓝图草稿 |
| `aegis blueprint:summary` | 渲染蓝图摘要和决策请求 |
| `aegis blueprint:confirm` | 锁定草稿为正式项目蓝图 |
| `aegis task:next` | 从蓝图生成下一个正式 current-task.md |
| `aegis task:review` | 施工前检查当前任务单质量 |
| `aegis superpower:scan` | 记录 Superpower 源文件引用 |
| `aegis discipline:check` | 验证当前轮 Superpower 纪律证据 |
| `aegis validate` | 运行本地质量门（测试、lint、类型检查、覆盖率） |
| `aegis round:check` | 送审前综合门禁（安全 + 任务 + 纪律 + 验证） |
| `aegis review:prompt` | 生成 Codex 只读审查材料包 |
| `aegis review:render` | 将 Codex JSONL 渲染为可读审查报告 |
| `aegis review:run` | 完整审查循环：生成 prompt → Codex → 渲染 → 路由裁决 |
| `aegis safety:check` | 硬阻断禁区动作和文件范围违规 |
| `aegis commit:suggest` | Codex PASS 后渲染提交建议 |
| `aegis status` | 显示当前阶段、任务、模式和下一步 |

### 运行态目录

```text
.aegis/
  config/
    aegis.json              ← Aegis 配置
    quality-gates.json      ← 质量门定义
    codex-rubric.md         ← Codex 审查标准
    claude-code-contract.md ← Claude Code 托管规则
  blueprint/
    project-blueprint.md    ← 已确认的项目蓝图
    project-progress.md     ← 自动刷新的进度快照
  state/
    run-state.json          ← 唯一机器真相
  current/
    current-task.md         ← 当前轮施工单
    status.md               ← 人类可读的阶段快照
    work-instruction.md     ← Claude Code 的下一步指令
    round-summary.md        ← 本轮完成总结
    decision-request.md     ← 等待人类决策
    human-handoff.md        ← 需要人类介入
    *-evidence.md           ← 纪律证据（计划/TDD/调试/验证）
    validation-report.md    ← 质量门执行结果
    codex-review-prompt.md  ← 生成的 Codex 送审包
    codex-review.md         ← 渲染后的审查报告
  archive/
    <task-id>/              ← 已完成轮次归档（不入 Git）
```

`run-state.json` 是紧凑的机器真相。导航文件为 Claude Code 读取而生成。`archive/` 被 gitignore 排除。

### Aegis 不是什么

- 不是新的 AI Agent 平台。
- 不是 Claude Code 的替代品。
- 不运行模型。Aegis 从不调用 AI 模型。
- 不是交互式 CLI。Aegis 是非交互式的。
- Aegis 永远不 commit、push、merge、rebase、deploy、release、publish。
- Aegis 不接管 Superpower 的原生目录和方法论。

### 验证命令

```bash
npm run typecheck
npm run build
npm run lint
npm test
node dist/cli/main.js safety:check
node dist/cli/main.js task:review
git diff --check
```

### 文档索引

| 文档 | 内容 |
|---|---|
| [docs/AEGIS_PRODUCT_DECISIONS.md](docs/AEGIS_PRODUCT_DECISIONS.md) | 产品定位与设计决策 |
| [docs/AEGIS_RUNTIME_SPEC.md](docs/AEGIS_RUNTIME_SPEC.md) | 运行态目录规范与文件契约 |
| [docs/AEGIS_MVP_ROADMAP.md](docs/AEGIS_MVP_ROADMAP.md) | MVP 范围与阶段路线图 |
| [docs/AEGIS_CLAUDE_CODE_CONTRACT.md](docs/AEGIS_CLAUDE_CODE_CONTRACT.md) | Claude Code 必须遵守的协议 |
| [docs/AEGIS_COMPLETION_AUDIT.md](docs/AEGIS_COMPLETION_AUDIT.md) | 重构完工审计 |
| [docs/AEGIS_LEGACY_REMOVAL.md](docs/AEGIS_LEGACY_REMOVAL.md) | 旧 .agent fallback 移除记录 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 项目交接与状态摘要 |
| [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md) | 新项目接入指南 |
| [aegis-starter/README.md](aegis-starter/README.md) | Starter 包文档 |

### 许可协议

MIT
