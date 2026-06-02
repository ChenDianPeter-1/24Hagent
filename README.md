# 24Hagent

> Repositioning in progress: 24Hagent is being rewritten as **Aegis**, a Claude Code delivery gate and Codex review communicator.
>
> New product formula:
>
> ```text
> Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
> ```
>
> The rewrite is tracked from GitHub issue `#14`. The current target specs are:
>
> - `docs/AEGIS_PRODUCT_DECISIONS.md`
> - `docs/AEGIS_RUNTIME_SPEC.md`
> - `docs/AEGIS_MVP_ROADMAP.md`
>
> The old `24h` command remains historical context during migration. The new product identity is `aegis`.

一个运行在 Claude Code 内部的常驻编排器。它读项目蓝图、逐个拆任务、以 Worker 身份执行、独立跑本地质量门、调用 **Codex 作为跨模型对抗审查官**，根据 `PASS / NEED_FIX / NEED_HUMAN` 决定继续/返修/停机。人类只在战略节点和高风险点出现。

## 为什么存在

GitHub 上已有的自动编排工具（autobeat、baton、sisyphus、agent-fox）**全部是同模型多实例**编排——同一个模型既写代码又审代码，容易自嗨。

24Hagent 的差异化是 **Claude 主控 + Codex 异模型对抗审查 + codegraph 知识图谱结构分析**。用第二个模型的独立视角 + AST 级结构风险检测，防止 agent 自嗨。这是整个项目唯一不可替代的价值。

## 四角色协作

```
HUMAN（项目老板）
  │  写 PROJECT_BLUEPRINT.md，只在战略节点出现
  ▼
CLAUDE CODE（主控环境）
  ├─ Orchestrator  读蓝图 → 拆任务 → 派工 → 独立复跑质量门 → 调 Codex 审查 → git commit
  └─ Worker        只做 CURRENT_TASK.md 里的活，TDD 先写失败测试再实现
       │
       │  codex exec --sandbox read-only --json
       ▼
CODEX（外部只读审查官）
  纯只读，不跑测试/不写文件/不构建
  用 codegraph 做结构影响面分析
  输出 verdict: PASS / NEED_FIX / NEED_HUMAN
```

## 三条铁律

1. **测试归 Claude Code，Codex 永不跑测试。** Worker 写+跑，Orchestrator 独立复跑。Codex 把 `VALIDATION_REPORT.md` 当证据消费，不复测。
2. **Codex 全程只读。** `codex exec --sandbox read-only` 从机制上禁止写文件/跑构建，省额度是天然结果。
3. **要跑哪些测试在任务包里提前说死。** `CURRENT_TASK.md` 强制字段 `acceptance_checks`，Orchestrator 派工时写明。

## 一个完整循环长什么样

```
选任务 → 写 CURRENT_TASK.md（含 acceptance_checks）
  → Worker TDD 实现 → 写 WORK_REPORT.md
  → Orchestrator 独立复跑质量门 → 写 VALIDATION_REPORT.md
  → Codex 审查（读 diff + codegraph 查结构）→ 写 CODEX_REVIEW.md
  → PASS 继续 / NEED_FIX 返修（最多 2 次）/ NEED_HUMAN 停机
  → git commit（Claude Code 脏活）
```

## 项目结构

```
├── CLAUDE_ORCHESTRATOR_PROTOCOL.md   编排器操作系统（状态机、三分支、停机条件）
├── START_ORCHESTRATOR.md             启动入口（3 种模式 + 前置检查）
├── README.md                         你正在看的文件
├── docs/
│   ├── HANDOFF.md                    项目交接文档（当前状态总览）
│   ├── HOW_TO_NEW_PROJECT.md         如何把 24Hagent 用到新项目（一页纸）
│   ├── ARCHITECTURE_BOUNDARIES.md    模块边界规则
│   └── superpowers/specs/            设计蓝图 + 实施计划
├── src/                                TypeScript 核心（B3 交付）
│   ├── cli/                             CLI 命令入口
│   ├── core/quality/                    ReadinessEngine + ValidationEngine + TaskQualityGate
│   ├── core/review/                     evidence-builder + prompt-builder + result-renderer
│   └── core/schemas/                    4 个 Zod schema
├── scripts/                             setup.ps1（项目初始化）
├── .agent/                           运行态（gitignored）
│   ├── PROJECT_BLUEPRINT.md          项目蓝图（人类写，Orchestrator 每轮读）
│   ├── CURRENT_TASK.md               当前任务包（含 acceptance_checks）
│   ├── QUALITY_GATES.json            质量门定义（100% coverage 默认硬门）
│   ├── CODEX_REVIEW_RUBRIC.md        审查标准（含 codegraph 结构检查条目）
│   └── ...                           其他运行态文件
└── sandbox/string-utils/             Phase B 验证对象（独立 TS git 仓库）
    └── src/slugify.ts                已实现 slugify + truncateSlug，13 tests, 100% coverage
```

## 快速开始

### 前置条件

- Windows + PowerShell 5.1 + Node 20
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/setup)（`claude --version`）
- [codex-cli](https://github.com/openai/codex) 0.134+（可选，用于异模型审查）
- `~/.codex/config.toml` 已配置 `[mcp_servers.codegraph]`（可选但推荐）
- 你的项目是 git 仓库
- 支持 Node.js 和 Python 项目（starter 自动检测）

### 5 步启动

```bash
# 1. 复制 starter 到你的项目
cp -r 24hagent-starter <你的项目>/

# 2. 双击 Start.bat（或 bash setup.sh）
# starter 自动检测技术栈，生成 .agent/ 运行态

# 3. Claude Code 接入向导会帮你填蓝图、设质量门

# 4. 确认后启动编排循环
# 从 START_ORCHESTRATOR.md 复制提示词

# 5. 人类只在出现 HUMAN_HANDOFF.md 时介入
```

详见 [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md)。

## 关键命令速查

| 命令 | 用途 |
|------|------|
| `24h readiness` | 就绪检查（BLOCKED/READY） |
| `24h validate` | 本地质量门（test/lint/typecheck/coverage） |
| `24h validate:plan` | 预览质量门执行计划 |
| `24h review:prompt` | 生成 Codex 审查 prompt |
| `24h review:render` | 从 JSONL 渲染审查报告 |
| `24h task:review` | 执行前任务包质量门审查 |

## 当前状态

### Sandbox 验证（已完成 ✓）

在 `sandbox/string-utils/`（独立 TS git 仓库）上，24Hagent 核心闭环已真实验证：

- PASS 路径：B3 slugify 实现 → 4 gate PASS → Codex PASS → commit ✓
- NEED_FIX 路径：B4 underscore 测试遗漏 → Codex NEED_FIX → 返修 → PASS ✓
- codegraph 审查：B5 11 次 MCP 工具调用，结构依赖分析真实生效 ✓
- 安全护栏：`--sandbox read-only`、3 条铁律、HUMAN_HANDOFF 门禁、retry_count≤2 ✓

### 根项目自举（进行中）

根项目（24Hagent 工具本身）自进化循环持续迭代：

- B3 闭环已打通：PASS / NEED_FIX / NEED_HUMAN 三分支真实验证
- 模块边界护栏已接入（eslint-plugin-boundaries），详见 `docs/ARCHITECTURE_BOUNDARIES.md`
- 任务质量门已上线（`24h task:review`），执行前审查任务包质量
- 详见 `.agent/PROJECT_STATE.md`

## 明确不做

- 多 Worker 并行 / DAG 依赖
- PR shepherd / 自动 push / 自动 merge
- 真 daemon / 24h 轮询（第一版手动启动、自动跑到停机）
- Codex implement（只用 Codex review，保持角色边界）
- BEADS / SQLite 状态库（第一版 `.agent/*.md` + `RUN_STATE.json` 足够）
