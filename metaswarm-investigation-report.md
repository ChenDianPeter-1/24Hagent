# metaswarm 调研报告：对 24Hagent MVP 的可复用价值

## 结论摘要

`metaswarm` 和 `mvp.md` 的目标高度相近，但不是同一个形态。

`mvp.md` 想做的是：

- Claude Code 内部常驻 Orchestrator
- Codex 作为外部审查官
- `.agent/` 文件作为长期状态和运行轨道
- 每轮 `CURRENT_TASK -> WORK_REPORT -> CODEX_REVIEW -> LOOP_DECISION`
- 审查结果严格是 `PASS / NEED_FIX / NEED_HUMAN`

`metaswarm` 做的是：

- 一套跨 Claude Code / Codex CLI / Gemini CLI 的 agent workflow 插件
- 以 BEADS `.beads/` 为任务和状态主干
- 以技能、rubric、agent prompt、slash command 组织流程
- 核心执行单元是 `IMPLEMENT -> VALIDATE -> ADVERSARIAL REVIEW -> COMMIT`
- 它强调 TDD、独立验证、fresh reviewer、cross-model review、human escalation

所以判断是：

**metaswarm 可以作为 24Hagent 的“流程思想和组件库”，但不适合原样作为你的 MVP。**

你最值得借的是它的执行纪律、审查 rubric、external tool adapter、状态恢复思路；最不该照搬的是 BEADS 重依赖、9 阶段大流程、100% coverage 默认、PR shepherd 全链路。

## 仓库结构观察

核心文件和目录：

- `README.md`：总架构说明，定义 9 阶段 workflow、18 个 agent、4-phase execution loop。
- `skills/start/SKILL.md`：主入口，描述从任务启动、规划、设计审查、执行、PR、复盘的完整流程。
- `skills/orchestrated-execution/SKILL.md`：最关键，定义每个 work unit 的 4 阶段执行循环。
- `skills/external-tools/SKILL.md`：定义如何把 Codex/Gemini 当外部工具调度。
- `skills/external-tools/adapters/codex.sh`：Codex CLI adapter，支持 `health / implement / review`。
- `skills/external-tools/adapters/_common.sh`：worktree、timeout、日志、错误分类、JSON 输出等通用能力。
- `skills/plan-review-gate/SKILL.md`：计划审查门，3 个独立 adversarial reviewers。
- `skills/design-review-gate/SKILL.md`：设计审查门，PM/Architect/Designer/Security/CTO 并行审查。
- `rubrics/adversarial-review-rubric.md`：最适合直接移植到你项目里的 Codex 审查标准。
- `templates/external-tools.yaml`：外部工具配置模板。
- `templates/CLAUDE-append.md`、`templates/AGENTS.md`：可以借鉴怎么向 Claude/Codex 注入流程规则。

## 与 mvp.md 的匹配度

### 高度匹配

1. Claude 主控、其他模型审查

`metaswarm` 的 external-tools 设计里，外部工具可以是 Codex/Gemini。它明确要求：

- 一个 invocation 只做一件事：实现或审查
- 外部工具不能自证成功
- Orchestrator 必须独立验证
- writer always reviewed by a different model

这和你的 `Claude Code = 主运行环境，Codex = 审查官` 基本同构。

2. 每个任务必须过审查门

`skills/orchestrated-execution/SKILL.md` 的核心状态机：

```text
IMPLEMENT -> VALIDATE -> ADVERSARIAL REVIEW -> COMMIT
```

失败后：

```text
FAIL -> fix -> re-validate -> fresh re-review -> max 3 -> human escalation
```

这可以直接映射到你的：

```text
Claude 执行 -> 写报告 -> Codex Review -> PASS / NEED_FIX / NEED_HUMAN
```

3. 审查必须是二元、证据驱动

`rubrics/adversarial-review-rubric.md` 明确区分：

- collaborative review：怎么让代码更好
- adversarial review：是否满足合同

它要求：

- Verdict 只能是 `PASS / FAIL`
- 每个 DoD 都要有 file:line evidence
- 任一 blocking issue 都导致 FAIL
- 不能给泛泛建议

这正好可以改成你要的 Codex 审查协议：

```yaml
verdict: PASS | NEED_FIX | NEED_HUMAN
blocking_issues:
required_fixes:
evidence:
next_action:
```

4. 不信任 worker 自述

metaswarm 的一个核心原则是 `Trust nothing. Verify everything.`。它明确要求 Orchestrator 自己跑测试、lint、typecheck、coverage、file scope check，而不是相信 coder agent 说“测试通过”。

这点应该成为 24Hagent 的硬规则。

5. 上下文恢复

metaswarm 用：

- `.beads/plans/active-plan.md`
- `.beads/context/project-context.md`
- `.beads/context/execution-state.md`

保存 active plan、项目上下文、当前执行位置。

你的设计用：

- `.agent/PROJECT_STATE.md`
- `.agent/TASK_QUEUE.md`
- `.agent/CURRENT_TASK.md`
- `.agent/WORK_REPORT.md`
- `.agent/CODEX_REVIEW.md`

两者目的相同，只是存储模型不同。

### 部分匹配

1. Task queue

metaswarm 使用 BEADS 管 task/epic/dependency/status，而你的 MVP 想用 Markdown 文件。

BEADS 能力更强，但引入成本更高。对你的第一版 MVP 来说，建议不要依赖 BEADS，先用 `.agent/TASK_QUEUE.md` 或 `.agent/tasks.json`。


2. Long-running

metaswarm 是 workflow/plugin，不是一个真正的常驻 daemon。它有状态恢复和 PR shepherd，但没有你文档里那种 “Claude Code 内部启动一个 24 小时循环 agent” 的最小闭环实现。

所以你要自己补：

- loop runner protocol
- 当前任务锁
- sleep / polling / stop condition
- Codex 调用与审查结果落盘

3. Codex 调用层

`skills/external-tools/adapters/codex.sh` 已经很接近可用，但它是 Bash 脚本，且默认面向 Unix-like 环境。你当前主要在 Windows 上工作，需要考虑 Git Bash/WSL/PowerShell 适配。

另外，adapter 的 review 输出最后是 Codex JSONL raw log + structured envelope，Orchestrator 仍需自己解析出真正的 `verdict`。

### 不匹配

1. `.agent/` 文件协议不存在

我在仓库里没有找到 `PROJECT_STATE`、`TASK_QUEUE`、`CURRENT_TASK`、`WORK_REPORT`、`CODEX_REVIEW`、`HUMAN_HANDOFF` 这套文件名。metaswarm 走的是 `.beads/` 和 BEADS CLI。

所以你的 `.agent/` 协议是自己的差异化，不是 metaswarm 已经实现的东西。

2. 9 阶段全流程过重

metaswarm 的完整流程包括：

- Research
- Plan
- Design Review Gate
- Work Unit Decomposition
- Orchestrated Execution
- Final Review
- PR Creation
- PR Shepherd
- Closure & Learning

你的 MVP 第一版不应该全部照搬。否则会变成还没跑起来就先背一个平台。

3. 100% coverage/TDD 默认过重

metaswarm 默认强调 TDD 和 100% coverage。这个适合严肃生产代码，但对你的 24Hagent MVP 来说可能拖慢验证速度。

建议把它降级为可配置质量门：

- MVP 阶段：必须跑已有测试、lint/typecheck 如存在
- 关键项目：开启 coverage threshold
- 不要默认强制 100%

## 最值得直接借用的东西

### 1. 4-phase execution loop

来源：`skills/orchestrated-execution/SKILL.md`

建议改造成你的 24Hagent 内核：

```text
GENERATE_TASK
  -> EXECUTE_TASK
  -> VALIDATE_LOCALLY
  -> ASK_CODEX_REVIEW
  -> HANDLE_REVIEW
  -> COMMIT_OR_FIX_OR_HANDOFF
```

你的文档里缺一个明确的 `VALIDATE_LOCALLY` 阶段。建议补上。Codex 审查前，Claude Orchestrator 应该先自己跑测试和 diff scope check。

### 2. Fresh reviewer rule

来源：`skills/orchestrated-execution/SKILL.md`、`rubrics/adversarial-review-rubric.md`

核心思想：

- 每次 review 必须新开审查上下文
- re-review 不给上一轮审查结果
- 只给 spec、DoD、diff

对你很重要。否则 Codex 会被上一轮发现的问题锚定，只检查“修没修那个问题”，而不是重新审全局。

24Hagent 可以这样规定：

```text
Codex Review 输入只包含：
1. PROJECT_BLUEPRINT.md
2. CURRENT_TASK.md
3. WORK_REPORT.md
4. git diff
5. validation output

返修后重新审查时，不包含上一轮 CODEX_REVIEW.md，除非是 Claude Orchestrator 自己用于生成 fix task。
```

### 3. Adversarial review rubric

来源：`rubrics/adversarial-review-rubric.md`

可直接改造成 `CODEX_REVIEW_RUBRIC.md`。

建议你的输出格式：

```yaml
verdict: PASS | NEED_FIX | NEED_HUMAN
confidence: high | medium | low
blocking_issues:
  - id:
    severity:
    issue:
    evidence:
    required_fix:
non_blocking_suggestions:
  - issue:
    rationale:
human_questions:
  - question:
    options:
next_action: continue_next_task | fix_current_task | ask_human
```

### 4. External Codex adapter

来源：

- `skills/external-tools/adapters/codex.sh`
- `skills/external-tools/adapters/_common.sh`

可借能力：

- `health` 检查 Codex 是否可用
- `review` 用 `codex exec --sandbox read-only --json`
- `implement` 用 `codex exec --full-auto --json`
- `safe_invoke` timeout
- 最小 env，只传 `HOME/PATH/OPENAI_API_KEY/CODEX_API_KEY`
- stdout/stderr 分离
- JSON envelope
- raw log 落到 `~/.claude/sessions`

但对你的 MVP，建议第一版只借 `review`，不要先借 `implement`。

因为你的设计是 Claude 主控/执行，Codex 审查。Codex implement 会让角色边界变复杂。

### 5. Worktree 隔离思想

来源：`skills/external-tools/SKILL.md`、`_common.sh`

metaswarm 认为外部工具不应直接在主工作区乱改，而应在独立 worktree 里跑。

对你的 MVP：

- Codex 只审查：可直接 read-only，不需要 worktree
- 如果未来让 Codex 返修：必须 worktree
- 如果 Claude 连续任务长跑：阶段级 commit 或 worktree checkpoint 很重要

### 6. Human escalation 模板

来源：`skills/orchestrated-execution/SKILL.md`

它的升级报告格式很好：

- failure history
- root cause assessment
- options
- recommendation

可以直接映射到你的 `.agent/HUMAN_HANDOFF.md`。

### 7. Plan review gate

来源：`skills/plan-review-gate/SKILL.md`

你的 MVP 文档里强调“读蓝图、拆任务”，但缺少“计划生成后先审计划”的门。metaswarm 的 3 reviewer 模型很有用：

- Feasibility：计划能不能在真实代码库执行
- Completeness：是否覆盖所有需求
- Scope & Alignment：是否偏离用户请求

建议第一版不要真的开 3 个 agent，可把这三类检查做进 Orchestrator 自检清单。

## 不建议照搬的东西

### 1. BEADS 作为第一版状态系统

BEADS 很强，但它会让 MVP 依赖额外 CLI、数据库、任务模型、同步逻辑。你的需求目前更偏“可观察、可手工接管、少依赖”。

建议：

- 第一版用 `.agent/*.md` 或 `.agent/state.json`
- 第二版再考虑 BEADS 或 SQLite

### 2. 全套 18 agent 角色

你现在真正需要的角色只有：

- Orchestrator
- Worker
- Codex Reviewer
- Human

metaswarm 的 PM/Architect/Designer/Security/CTO/PR Shepherd 对你后面有用，但 MVP 先别展开。

### 3. PR shepherd 和 merge automation

你的当前目标是本地长期开发循环，不是完整 GitHub PR 生命周期。PR shepherd 应该放到后续阶段。

### 4. 默认自动 push/merge

metaswarm 的 `AGENTS.md` 里有“session completion 必须 push”的规则。这不适合你的本地 24Hagent，尤其是长时间无人值守场景。

你的规则应该是：

- 阶段完成后 commit
- 不自动 push
- 不自动 merge
- push/merge 必须 human approval

## 建议的 24Hagent 最小落地架构

### 文件结构

建议保留你原文的 `.agent/`，但吸收 metaswarm 的状态恢复字段：

```text
.agent/
  PROJECT_BLUEPRINT.md
  PROJECT_STATE.md
  TASK_QUEUE.md
  CURRENT_TASK.md
  VALIDATION_REPORT.md
  WORK_REPORT.md
  CODEX_REVIEW.md
  DECISION_LOG.md
  HUMAN_HANDOFF.md
  RUN_STATE.json
  CODEX_REVIEW_RUBRIC.md
```

`RUN_STATE.json` 建议机器可读：

```json
{
  "active_task_id": "T-001",
  "phase": "ASK_CODEX_REVIEW",
  "retry_count": 1,
  "last_verdict": "NEED_FIX",
  "updated_at": "2026-05-28T00:00:00+08:00"
}
```

### 状态机

建议从 metaswarm 的 4-phase 改成适配你需求的 7-phase：

```text
READ_BLUEPRINT
  -> PLAN_OR_UPDATE_QUEUE
  -> SELECT_CURRENT_TASK
  -> EXECUTE_TASK
  -> VALIDATE_LOCALLY
  -> ASK_CODEX_REVIEW
  -> HANDLE_REVIEW
```

`HANDLE_REVIEW`：

```text
PASS
  -> MARK_TASK_DONE
  -> COMMIT_IF_PHASE_BOUNDARY
  -> NEXT_TASK

NEED_FIX
  -> CREATE_FIX_TASK
  -> retry_count + 1
  -> if retry_count <= 2: EXECUTE_TASK
  -> else: HUMAN_HANDOFF

NEED_HUMAN
  -> HUMAN_HANDOFF
  -> STOP
```

### Codex 调用方式

第一版只做 review：

```bash
codex exec --sandbox read-only --json -C <repo> "<review prompt>"
```

输入 prompt 由 Claude Orchestrator 生成，包含：

- `PROJECT_BLUEPRINT.md`
- `PROJECT_STATE.md`
- `CURRENT_TASK.md`
- `WORK_REPORT.md`
- `VALIDATION_REPORT.md`
- `git diff`
- `CODEX_REVIEW_RUBRIC.md`

输出写入：

```text
.agent/CODEX_REVIEW.md
```

并从中提取：

```text
verdict
required_fixes
next_action
```

### 安全停机条件

借 metaswarm 的 escalation 模型，再按你的需求收紧：

- 同一任务连续 3 次 NEED_FIX
- Codex 返回 NEED_HUMAN
- 本地验证连续失败 3 次
- 任务需要删除大量文件
- 任务涉及密钥、支付、账号、网络权限
- 任务需要架构方向选择
- git diff 超出 CURRENT_TASK file scope
- Codex 审查输出无法解析

这些都写入 `.agent/HUMAN_HANDOFF.md` 并停止。

## 建议实施路线

### Phase 1：协议文件，不做自动执行

先写：

- `CLAUDE_ORCHESTRATOR_PROTOCOL.md`
- `.agent/CODEX_REVIEW_RUBRIC.md`
- `.agent/RUN_STATE.schema.json`
- `.agent/TASK_QUEUE.template.md`
- `.agent/HUMAN_HANDOFF.template.md`

目标是让 Claude Code 明确知道怎么跑。

### Phase 2：Codex review adapter

实现一个最小脚本，例如：

```text
scripts/codex_review.ps1
```

职责：

- 收集 `.agent` 文件
- 收集 `git diff`
- 生成 prompt
- 调 `codex exec --sandbox read-only --json`
- 保存 raw log
- 提取 verdict
- 写 `.agent/CODEX_REVIEW.md`

Windows 上建议先用 PowerShell，而不是直接搬 metaswarm 的 Bash adapter。

### Phase 3：Claude Orchestrator prompt

写一个启动提示词：

```text
读取 PROJECT_BLUEPRINT.md 和 CLAUDE_ORCHESTRATOR_PROTOCOL.md。
进入 Orchestrator 模式。
每轮只执行一个 CURRENT_TASK。
执行后运行本地验证。
验证后调用 scripts/codex_review.ps1。
根据 CODEX_REVIEW.md 的 verdict 继续、返修或 HUMAN_HANDOFF。
```

### Phase 4：循环控制

可以先不用真正 daemon，采用“手动启动但自动跑到停机条件”的方式。

等这个稳定后，再做 24 小时轮询/守护进程。

## 可复用资产清单

| metaswarm 资产 | 对 24Hagent 的用途 | 建议 |
|---|---|---|
| `skills/orchestrated-execution/SKILL.md` | 核心状态机和质量门禁 | 高优先级改写 |
| `rubrics/adversarial-review-rubric.md` | Codex 审查标准 | 几乎可直接改 |
| `skills/external-tools/adapters/codex.sh` | Codex CLI 调用参考 | 只借 review 思路，Windows 需重写 |
| `skills/external-tools/adapters/_common.sh` | timeout、日志、错误分类、worktree | 借思想，不建议原样用 |
| `skills/plan-review-gate/SKILL.md` | 计划审查逻辑 | 抽成 Orchestrator 自检 |
| `skills/design-review-gate/SKILL.md` | 高风险功能设计审查 | 后续版本再用 |
| `.beads/context/execution-state.md` 设计 | 状态恢复 | 映射为 `.agent/RUN_STATE.json` |
| `templates/external-tools.yaml` | 外部工具配置 | 简化成 `.agent/config.json` 或 `.agent/config.yaml` |
| `templates/CLAUDE-append.md` | 向 Claude 注入规则 | 改写成 `CLAUDE_ORCHESTRATOR_PROTOCOL.md` |

## 最终建议

你的 MVP 不要做“metaswarm 复制品”。更合理的路线是：

1. **借 metaswarm 的纪律**：work unit、DoD、独立验证、adversarial review、fresh reviewer、max retry、human escalation。
2. **保留你自己的形态**：Claude-side Orchestrator、Codex-only reviewer、`.agent/` 文件轨道、老板只在关键节点出现。
3. **先做最小闭环**：一个任务执行、一轮本地验证、一次 Codex review、根据 verdict 继续/返修/停机。
4. **暂缓平台化**：BEADS、PR shepherd、多 agent 并行、design gate、self-reflect 都放到第二阶段。

一句话：

**metaswarm 给你的不是一个能直接开跑的 24Hagent，而是一套已经验证过的“不要让 agent 自嗨”的工程纪律。你的产品价值在于把这套纪律压缩成 Claude Code 侧可常驻运行的轻量闭环。**
