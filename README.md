# 24Hagent

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
│   └── superpowers/specs/            设计蓝图 + 实施计划
├── scripts/
│   ├── check_quality_readiness.ps1   就绪检查（检测 test/lint/typecheck/coverage 工具链）
│   ├── validate_task.ps1             本地质量门（Orchestrator 独立复跑）
│   └── codex_review.ps1              组装审查包 + 调用 Codex + 解析 verdict
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
- [codex-cli](https://github.com/openai/codex) 0.134+（`codex --version`）
- `~/.codex/config.toml` 已配置 `[mcp_servers.codegraph]`（可选但推荐）
- 你的项目是 git 仓库，有 `package.json`，装了 test/lint/typecheck/coverage 工具

### 4 步启动

```powershell
# 1. 就绪检查——必须先过这关
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
# 看到 READY 才能继续。BLOCKED = 去装工具链。

# 2. 填项目蓝图
# 编辑 .agent/PROJECT_BLUEPRINT.md，写清你的项目目标/范围/边界/禁止项

# 3. 启动 Orchestrator
# 把 START_ORCHESTRATOR.md 里的"完整启动"提示词复制到 Claude Code

# 4. 人类只在出现 HUMAN_HANDOFF.md 时介入
```

详见 [docs/HOW_TO_NEW_PROJECT.md](docs/HOW_TO_NEW_PROJECT.md)。

## 关键命令速查

| 命令 | 用途 |
|------|------|
| `check_quality_readiness.ps1` | 就绪检查（BLOCKED/READY） |
| `validate_task.ps1` | 本地质量门（test/lint/typecheck/coverage） |
| `validate_task.ps1 -DryRun` | 预览质量门命令 |
| `codex_review.ps1` | Codex 真实审查（消耗额度） |
| `codex_review.ps1 -DryRun` | 预览审查包（不消耗额度） |

## 当前状态

### Sandbox 验证（已完成 ✓）

在 `sandbox/string-utils/`（独立 TS git 仓库）上，24Hagent 核心闭环已真实验证：

- PASS 路径：B3 slugify 实现 → 4 gate PASS → Codex PASS → commit ✓
- NEED_FIX 路径：B4 underscore 测试遗漏 → Codex NEED_FIX → 返修 → PASS ✓
- codegraph 审查：B5 11 次 MCP 工具调用，结构依赖分析真实生效 ✓
- 安全护栏：`--sandbox read-only`、3 条铁律、HUMAN_HANDOFF 门禁、retry_count≤2 ✓

### 根项目自举（进行中）

根项目（24Hagent 工具本身）的自进化循环尚未闭合：

- 根项目 quality gates 当前为 BLOCKED（无 TypeScript 工具链）
- 正在按 Codex 审查后的 Route B+ 路线执行自进化
- 当前阶段：B0 状态归一化（对齐文档与运行态）
- 详见 `.agent/CURRENT_TASK.md` 和 `.agent/PROJECT_STATE.md`

## 明确不做

- 多 Worker 并行 / DAG 依赖
- PR shepherd / 自动 push / 自动 merge
- 真 daemon / 24h 轮询（第一版手动启动、自动跑到停机）
- Codex implement（只用 Codex review，保持角色边界）
- BEADS / SQLite 状态库（第一版 `.agent/*.md` + `RUN_STATE.json` 足够）
