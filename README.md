<div id="top">

<div align="center">

# <code>Aegis</code>

<em>A delivery gate that lives inside Claude Code / 寄生在 Claude Code 里的交付门禁</em>

<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat-square&logo=TypeScript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Node.js-20%2B-339933.svg?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/Vitest-6E9F18.svg?style=flat-square&logo=Vitest&logoColor=white" alt="Vitest">
<img src="https://img.shields.io/badge/Zod-3E67B1.svg?style=flat-square&logo=Zod&logoColor=white" alt="Zod">
<img src="https://img.shields.io/badge/ESLint-4B32C3.svg?style=flat-square&logo=ESLint&logoColor=white" alt="ESLint">
<br>
<img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/tests-202%20passed-success.svg?style=flat-square" alt="Tests">

**<a href="#english">English</a> | <a href="#chinese">中文</a>**

</div>

---

<h2 id="english"> English</h2>

<div align="right"><a href="#top">Back to top </a></div>

## ✨ Overview

**Aegis** is a non-interactive delivery gate that lives inside Claude Code. It does not replace Claude Code, and it does not become another autonomous coding agent.

Think of a construction site:

| Role | Who | Responsibility |
|---|---|---|
| Foreman | You | Set direction, handle high-risk decisions |
| Crew | Claude Code | Understand goals, break down tasks, write code |
| **Inspector** | **Aegis** | **Check blueprints, run quality gates, package evidence** |
| Auditor | Codex | Read-only review, return PASS / NEED_FIX / NEED_HUMAN |

Aegis is the inspector. It ensures every round of work is planned, checked, and reviewed before the next round begins.

```text
Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
```

## 💡 Why Aegis

Claude Code is powerful but overconfident. It can drift from the goal, skip tests, expand scope, and mark its own homework.

Aegis adds a **mechanical verification layer** that Claude Code cannot bypass:

- **Task quality gate** — every task is reviewed before construction starts
- **Local quality gates** — tests, lint, typecheck, and coverage run automatically
- **Discipline evidence** — every round must leave planning, TDD, and debugging records
- **Codex review** — every change is packaged for an independent second opinion
- **Verdict routing** — PASS  next round, NEED_FIX  repair, NEED_HUMAN  stop and ask

Aegis never writes product code, never commits, never pushes, and never calls AI models. It only checks, packages, and routes.

## 📌 Features

- **Non-interactive CLI** — run `aegis` and it auto-advances to the next stop point
- **Task quality gate** — validates `current-task.md` before any code is written
- **Superpower integration** — scans Superpower sources for discipline evidence
- **Discipline gate** — verifies planning, TDD, debugging, and review evidence exist
- **Local quality gates** — runs test, lint, typecheck, and coverage automatically
- **Codex review pipeline** — builds evidence packets, generates review prompts, renders verdicts
- **Verdict routing** — PASS archives the round, NEED_FIX triggers repair, NEED_HUMAN stops for human
- **Safety hard-blocks** — forbidden actions (commit, push, deploy, rebase) are blocked
- **Progression modes** — `auto`, `allow`, and `ask` control how Aegis advances after PASS
- **Round archiving** — completed rounds are archived to `.aegis/archive/` (excluded from git)
- **Bundled starter** — copy `aegis-starter/` into any project, double-click, and Claude Code handles the rest

## 🔄 How It Works

One round of Aegis-governed work:

```text
You: "Use Aegis to start."
        │
        ▼
┌─────────────────────────────────────────┐
│  1. Blueprint                           │
│     Claude Code drafts a blueprint      │
│     Aegis locks it as confirmed         │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  2. Task Shaping                        │
│     Aegis extracts the next minimal     │
│     task from the blueprint             │
│     Writes current-task.md              │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  3. Pre-construction Gates              │
│     task:review    check task quality   │
│     safety:check   scan for forbidden   │
│                    actions              │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  4. Construction                        │
│     Claude Code builds per task spec    │
│     Leaves evidence in .aegis/current/  │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  5. Post-construction Gates             │
│     discipline:check  verify evidence   │
│     validate          test/lint/typechk │
│     round:check       pre-Codex combo   │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  6. Codex Review                        │
│     review:prompt  build evidence       │
│     Codex reads, returns verdict        │
│     review:render  readable report      │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  7. Verdict                             │
│     PASS        archive, next task     │
│     NEED_FIX    repair (capped)        │
│     NEED_HUMAN  stop, write handoff    │
└─────────────────────────────────────────┘
```

## 📁 Project Structure

```sh
aegis/
├── .aegis/                    # Runtime state directory
│   ├── config/                # Quality gates, Codex rubric, Claude Code contract
│   ├── blueprint/             # Project blueprint + progress snapshot
│   ├── current/               # Current task, status, evidence, reports
│   ├── state/                 # run-state.json (single machine source of truth)
│   └── archive/               # Completed round snapshots (gitignored)
├── aegis-starter/             # Bundled starter kit for other projects
│   ├── Start.bat              # Windows double-click launcher
│   ├── .claude/skills/        # Superpower + aegis-install skills
│   └── bin/                   # Local aegis CLI entry
├── src/
│   ├── cli/                   # CLI command handlers (main, aegis, blueprint, safety, etc.)
│   └── core/
│       ├── aegis-runtime/     # Paths, run-state, navigation, controller, safety
│       ├── quality/           # Validation engine, readiness, task quality gate
│       ├── review/            # Evidence builder, prompt builder, result renderer
│       ├── schemas/           # Zod schemas for runtime types
│       └── superpower/        # Superpower source scanner
├── tests/                     # 27 test files, 202 tests
├── docs/                      # Product decisions, runtime spec, roadmap, contract
├── package.json
└── README.md
```

## 🚀 Getting Started

### 📋 Prerequisites

- **Node.js** 20 or newer
- **npm** (bundled with Node.js)
- **Claude CLI** on PATH (for automatic Claude Code launch in starter)

### ⚙️ Installation

**In the Aegis project itself:**

```sh
git clone https://github.com/ChenDianPeter-1/24Hagent.git
cd 24Hagent
npm ci
npm run build
```

**To use Aegis in another project:**

```sh
# 1. Copy the starter into your target project
cp -r aegis-starter/ /path/to/your-project/

# 2. Double-click Start.bat (Windows)
#    Or run: powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1

# 3. The starter installs .aegis/ runtime + Superpower skills
# 4. Claude Code takes over via the aegis-install skill
```

### 💻 Usage

Inside Claude Code, say:

```text
Use Aegis to start.
Use Aegis to continue.
```

Claude Code runs `aegis`, reads the generated navigation files, performs only the instructed work, leaves evidence, and runs `aegis` again.

Run `aegis` directly from the terminal:

```sh
aegis                 # Refresh navigation, advance state
aegis status          # Show current phase, task, and mode
aegis round:check     # Run full pre-Codex gate suite
```

### 🧪 Testing

This project uses [Vitest](https://vitest.dev/). Run the test suite with:

```sh
npm test
```

Current baseline: **27 test files, 202 tests passed**.

## 📟 Commands

| Command | Purpose |
|---|---|
| `aegis` | Refresh navigation, advance state until stop required |
| `aegis contract` | Print the Claude Code hosting contract |
| `aegis blueprint:start` | Prepare a Superpower-guided blueprint draft |
| `aegis blueprint:summary` | Render blueprint summary + decision request |
| `aegis blueprint:confirm` | Lock the draft as confirmed project blueprint |
| `aegis task:next` | Generate the next formal current-task.md |
| `aegis task:review` | Check current-task quality before construction |
| `aegis superpower:scan` | Record Superpower source file references |
| `aegis discipline:check` | Verify current-round discipline evidence |
| `aegis validate` | Run local quality gates (test, lint, typecheck, coverage) |
| `aegis round:check` | Combined pre-Codex gate |
| `aegis review:prompt` | Generate Codex review prompt packet |
| `aegis review:render` | Render Codex JSONL into readable report |
| `aegis safety:check` | Hard-block forbidden actions |
| `aegis status` | Show current phase, task, mode, next action |

## 📖 Documentation

| Document | Content |
|---|---|
| [docs/AEGIS_PRODUCT_DECISIONS.md](docs/AEGIS_PRODUCT_DECISIONS.md) | Product positioning and design rationale |
| [docs/AEGIS_RUNTIME_SPEC.md](docs/AEGIS_RUNTIME_SPEC.md) | Runtime directory spec and file contracts |
| [docs/AEGIS_MVP_ROADMAP.md](docs/AEGIS_MVP_ROADMAP.md) | MVP scope and phase roadmap |
| [docs/AEGIS_CLAUDE_CODE_CONTRACT.md](docs/AEGIS_CLAUDE_CODE_CONTRACT.md) | The contract Claude Code must follow |
| [docs/AEGIS_COMPLETION_AUDIT.md](docs/AEGIS_COMPLETION_AUDIT.md) | Rewrite completion audit |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Project handoff and state summary |
| [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md) | Guide for onboarding a new project |
| [aegis-starter/README.md](aegis-starter/README.md) | Starter package documentation |

## 📈 Roadmap

- [X] **Product positioning & .aegis/ runtime scaffold**
- [X] **Single-entry `aegis` non-interactive CLI**
- [X] **Blueprint flow (draft  confirm  task generation)**
- [X] **Superpower integration & discipline gate**
- [X] **Quality gates + Codex review loop**
- [X] **Safety boundaries & forbidden-action enforcement**
- [X] **Auto / Allow / Ask progression modes**
- [X] **Round archiving & starter migration**
- [ ] **Richer blueprint revision UX**
- [ ] **More starter profiles for additional project types**
- [ ] **Configurable coverage thresholds**

## 🤝 Contributing

- ** [Report Issues](https://github.com/ChenDianPeter-1/24Hagent/issues)** — submit bugs or feature requests
- ** [Submit Pull Requests](https://github.com/ChenDianPeter-1/24Hagent/pulls)** — review open PRs or submit your own

<details>
<summary>Contributing Guidelines</summary>

1. **Fork the Repository** — fork the project to your GitHub account
2. **Clone Locally** — `git clone https://github.com/ChenDianPeter-1/24Hagent.git`
3. **Create a Branch** — `git checkout -b new-feature-x`
4. **Make Changes** — develop and test locally
5. **Commit** — `git commit -m 'Implemented new feature x.'`
6. **Push** — `git push origin new-feature-x`
7. **Submit a PR** — create a PR against the main branch

</details>

## 📜 License

Aegis is distributed under the [MIT](LICENSE) license.

---

<h2 id="chinese"> 中文</h2>

<div align="right"><a href="#top">回到顶部 </a></div>

## ✨ 概述

**Aegis** 是寄生在 Claude Code 里的非交互式交付门禁系统。它不替代 Claude Code，也不是另一个自主编码 Agent。

把它想象成一个建筑工地：

| 角色 | 谁 | 职责 |
|---|---|---|
| 甲方 | 你 | 定方向，处理高风险决策 |
| 施工队 | Claude Code | 理解目标，拆解任务，写代码 |
| **质检员** | **Aegis** | **检查蓝图，跑质量门，打包审查材料** |
| 外部监理 | Codex | 只读审查，返回 PASS / NEED_FIX / NEED_HUMAN |

Aegis 就是那个质检员。它确保每一轮工作都是先计划、再检查、再审查，才能进入下一轮。

```text
Aegis = Superpower 纪律 + Claude Code 施工 + Aegis 门禁 + Codex 外审
```

## 💡 为什么需要 Aegis

Claude Code 很强大但容易过度自信。它会偏离目标、跳过测试、扩大范围、给自己的作业打分。

Aegis 增加了一层 **Claude Code 无法绕过的机械验证层**：

- **任务质量门** — 每轮任务开工前必须通过任务单审查
- **本地质量门** — 测试、lint、类型检查、覆盖率自动运行
- **纪律证据** — 每轮必须留下计划、TDD、调试记录
- **Codex 审查** — 每次改动打包成独立第二方审查材料
- **裁决路由** — PASS  下一轮，NEED_FIX  返修，NEED_HUMAN  停机等你

Aegis 永远不写产品代码、不 commit、不 push、不调用 AI 模型。它只做检查、打包和路由。

## 📌 功能特性

- **非交互式 CLI** — 运行 `aegis` 即可自动推进到下一个停止点
- **任务质量门** — 在动代码之前检查 `current-task.md` 是否合格
- **Superpower 集成** — 扫描 Superpower 源文件获取纪律证据
- **纪律门** — 验证计划、TDD、调试、审查证据是否完整
- **本地质量门** — 自动运行 test、lint、typecheck、coverage
- **Codex 审查管线** — 构建证据包、生成审查 prompt、渲染裁决结果
- **裁决路由** — PASS 归档本轮，NEED_FIX 触发返修，NEED_HUMAN 停机等人
- **安全硬阻断** — 禁区动作（commit、push、deploy、rebase）被阻断
- **延展模式** — `auto`、`allow`、`ask` 三种模式控制 PASS 后的行为
- **轮次归档** — 已完成轮次归档到 `.aegis/archive/`（不入 Git）
- **内置 Starter** — 复制 `aegis-starter/` 到任意项目，双击即可启动

## 🔄 工作流程

Aegis 驱动下的一轮完整工作：

```text
你："用 Aegis 启动。"
        │
        ▼
┌─────────────────────────────────────────┐
│  1. 蓝图                                 │
│     Claude Code 起草蓝图                 │
│     Aegis 锁定为正式项目蓝图              │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  2. 塑形                                 │
│     Aegis 从蓝图中拆出下一轮最小任务      │
│     生成 current-task.md                 │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  3. 开工前检查                           │
│     task:review    检查任务单质量        │
│     safety:check   扫描禁区动作          │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  4. 施工                                 │
│     Claude Code 按任务单改代码           │
│     在 .aegis/current/ 留下施工证据      │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  5. 验收                                 │
│     discipline:check  验证纪律证据       │
│     validate          测试/lint/类型     │
│     round:check       送审前综合门禁     │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  6. 送审                                 │
│     review:prompt  构建送审材料          │
│     Codex 只读审查，返回裁决             │
│     review:render  可读审查报告          │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  7. 裁决                                 │
│     PASS        归档，下一任务          │
│     NEED_FIX    返修（有次数上限）       │
│     NEED_HUMAN  停机，写 handoff        │
└─────────────────────────────────────────┘
```

## 📁 项目结构

```sh
aegis/
├── .aegis/                    # 运行态目录
│   ├── config/                # 质量门、Codex 审查标准、Claude Code 操作协议
│   ├── blueprint/             # 项目蓝图 + 进度快照
│   ├── current/               # 当前任务、状态、证据、报告
│   ├── state/                 # run-state.json（唯一机器真相）
│   └── archive/               # 已完成轮次归档（不入 Git）
├── aegis-starter/             # 内置 Starter 套件
│   ├── Start.bat              # Windows 双击启动
│   ├── .claude/skills/        # Superpower + aegis-install 技能
│   └── bin/                   # 本地 aegis CLI 入口
├── src/
│   ├── cli/                   # CLI 命令处理（main、aegis、blueprint、safety 等）
│   └── core/
│       ├── aegis-runtime/     # 路径、运行状态、导航、控制器、安全
│       ├── quality/           # 验证引擎、就绪检查、任务质量门
│       ├── review/            # 证据构建器、Prompt 构建器、结果渲染器
│       ├── schemas/           # 运行时类型 Zod Schema
│       └── superpower/        # Superpower 源文件扫描器
├── tests/                     # 27 个测试文件，202 个测试用例
├── docs/                      # 产品决策、运行时规范、路线图、操作协议
├── package.json
└── README.md
```

## 🚀 快速开始

### 📋 前置要求

- **Node.js** 20 或更新版本
- **npm**（Node.js 自带）
- **Claude CLI** 在 PATH 中（Starter 自动启动 Claude Code 时需要）

### ⚙️ 安装

**在 Aegis 项目本身：**

```sh
git clone https://github.com/ChenDianPeter-1/24Hagent.git
cd 24Hagent
npm ci
npm run build
```

**在其他项目中使用 Aegis：**

```sh
# 1. 把 starter 复制到目标项目
cp -r aegis-starter/ /path/to/your-project/

# 2. 双击 Start.bat（Windows）
#    或运行：powershell -NoProfile -ExecutionPolicy Bypass -File aegis-starter/Start.ps1

# 3. Starter 自动安装 .aegis/ 运行态 + Superpower 技能套装
# 4. Claude Code 通过 aegis-install 技能接手引导
```

### 💻 使用

在 Claude Code 中说：

```text
用 Aegis 启动。
用 Aegis 继续。
```

Claude Code 会执行 `aegis`，读取生成的导航文件，只做被指示的工作，留下证据，然后再次运行 `aegis`。

在终端直接运行：

```sh
aegis                 # 刷新导航，推进状态
aegis status          # 查看当前阶段、任务和模式
aegis round:check     # 运行送审前完整门禁
```

### 🧪 测试

本项目使用 [Vitest](https://vitest.dev/)。运行测试：

```sh
npm test
```

当前基线：**27 个测试文件，202 个测试全部通过**。

## 📟 命令参考

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
| `aegis discipline:check` | 验证当前轮施工纪律证据 |
| `aegis validate` | 运行本地质量门（test、lint、typecheck、coverage） |
| `aegis round:check` | 送审前综合门禁 |
| `aegis review:prompt` | 生成 Codex 审查送审包 |
| `aegis review:render` | 将 Codex JSONL 渲染为可读报告 |
| `aegis safety:check` | 硬阻断禁区动作 |
| `aegis status` | 显示当前阶段、任务、模式、下一步 |

## 📖 文档索引

| 文档 | 内容 |
|---|---|
| [docs/AEGIS_PRODUCT_DECISIONS.md](docs/AEGIS_PRODUCT_DECISIONS.md) | 产品定位与设计决策 |
| [docs/AEGIS_RUNTIME_SPEC.md](docs/AEGIS_RUNTIME_SPEC.md) | 运行态目录规范与文件契约 |
| [docs/AEGIS_MVP_ROADMAP.md](docs/AEGIS_MVP_ROADMAP.md) | MVP 范围与阶段路线图 |
| [docs/AEGIS_CLAUDE_CODE_CONTRACT.md](docs/AEGIS_CLAUDE_CODE_CONTRACT.md) | Claude Code 必须遵守的协议 |
| [docs/AEGIS_COMPLETION_AUDIT.md](docs/AEGIS_COMPLETION_AUDIT.md) | 重构完工审计 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 项目交接与状态摘要 |
| [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md) | 新项目接入指南 |
| [aegis-starter/README.md](aegis-starter/README.md) | Starter 包文档 |

## 📈 路线图

- [X] **产品定位与 .aegis/ 运行态骨架**
- [X] **单一入口 `aegis` 非交互式 CLI**
- [X] **蓝图流（草稿  确认  任务生成）**
- [X] **Superpower 集成与纪律门**
- [X] **质量门 + Codex 审查闭环**
- [X] **安全边界与禁区动作强制**
- [X] **Auto / Allow / Ask 延展模式**
- [X] **轮次归档与 Starter 迁移**
- [ ] **更丰富的蓝图修订交互**
- [ ] **更多项目类型的 Starter 模板**
- [ ] **可配置的覆盖率阈值**

## 🤝 参与贡献

- ** [报告问题](https://github.com/ChenDianPeter-1/24Hagent/issues)** — 提交 bug 或功能请求
- ** [提交 PR](https://github.com/ChenDianPeter-1/24Hagent/pulls)** — 审查开放 PR 或提交你自己的

<details>
<summary>贡献指南</summary>

1. **Fork 仓库** — fork 项目到你的 GitHub 账号
2. **克隆到本地** — `git clone https://github.com/ChenDianPeter-1/24Hagent.git`
3. **新建分支** — `git checkout -b new-feature-x`
4. **修改代码** — 本地开发和测试
5. **提交** — `git commit -m '实现新功能 x'`
6. **推送** — `git push origin new-feature-x`
7. **发起 PR** — 向 main 分支创建 Pull Request

</details>

## 📜 许可协议

Aegis 基于 [MIT](LICENSE) 许可协议分发。

---

<div align="right">

[![][back-to-top]](#top)

</div>

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square

</div>
