# 24Hagent 最终交付蓝图与实施计划

设计文档 | 创建于 2026-05-29 | 状态：待用户评审

---

## 1. 项目定位与最终交付定义

### 一句话定位

24Hagent 是一个**运行在 Claude Code 内部的常驻编排器**：它读项目蓝图、逐个拆任务、以 Worker 身份执行、独立跑本地质量门、调用 **Codex 作为跨模型对抗审查官**，根据 `PASS / NEED_FIX / NEED_HUMAN` 决定继续/返修/停机。人类只在战略节点和高风险点出现。

### 唯一护城河（区别于所有竞品）

GitHub 调研（gh CLI 搜索）确认：autobeat、baton、sisyphus、agent-fox 等同类编排器**全部是同模型多实例**编排。24Hagent 的差异化是 **Claude 主控 + Codex 异模型对抗审查**——用第二个模型的独立视角防止 agent 自嗨。这是整个项目唯一不可替代的价值，因此第一优先级就是**真实验证它能跑通**。

**第二层护城河**：Codex 审查不止读 git diff 文本，还用 codegraph 知识图谱做**结构性影响面分析**（`codegraph_impact` 查改动会破坏什么、`codegraph_callers` 查谁依赖被改符号）。跨模型 + 知识图谱双重独立视角。

### 最终交付定义（"做完了"长这样）

不是"写完所有协议文档"，而是一个**可观测的真实闭环**：

> 24Hagent 能在一个真实的、带 git + 测试工具链的 sandbox 项目上，**全自动跑通至少一个完整循环**：
> `选任务 → Worker 执行 → 本地质量门 → 真实调用 Codex 审查 → 拿到真实 verdict → 按 verdict 继续/返修 → 阶段 commit`，
> 并且 **NEED_FIX 返修路径**也被真实触发验证过一次，全过程留下可信的 `DECISION_LOG` 和 git 历史。

跑通后，"自用工作流"形态即成立；"可复用工具"是后续近乎免费的衍生。

### 明确不做（YAGNI）

- BEADS / SQLite 状态库（第一版用 `.agent/*.md` + `RUN_STATE.json` 足够）
- 多 Worker 并行 / DAG 依赖
- PR shepherd / 自动 push / 自动 merge（明确禁止）
- 真正的 daemon / 24h 轮询（第一版做"手动启动、自动跑到停机条件"）
- Codex implement（只用 Codex review，保持角色边界清晰）

---

## 2. 系统架构与组件

### 2.1 四角色协作总图

```
┌─────────────────────────────────────────────────────────────────┐
│ HUMAN (项目老板)                                                   │
│   · 写 PROJECT_BLUEPRINT.md (战略输入)                             │
│   · 只在 HUMAN_HANDOFF / 高风险点出现并审批                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ 蓝图
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLAUDE CODE (主控运行环境) ── 承担全部产出+记账+git               │
│                                                                   │
│  ┌────────────────────────┐      ┌──────────────────────────┐   │
│  │ Orchestrator 身份       │      │ Worker 身份               │   │
│  │ · 读蓝图/状态           │ 派工 │ · 只做 CURRENT_TASK        │   │
│  │ · 拆任务→CURRENT_TASK   │─────▶│ · TDD: 先写失败测试        │   │
│  │ · 独立跑质量门(复跑)     │◀─────│ · 跑测试/lint/typecheck    │   │
│  │ · 调 Codex 审查         │ 报告 │ · 写 WORK_REPORT.md        │   │
│  │ · 处理 verdict          │      │ · 不越 file_scope          │   │
│  │ · git commit / 更新文档  │      └──────────────────────────┘   │
│  └───────────┬────────────┘                                      │
└──────────────┼───────────────────────────────────────────────────┘
              │ codex exec --sandbox read-only --json
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ CODEX (外部只读审查官) ── 纯只读，省额度                          │
│   输入: diff + CURRENT_TASK(含acceptance_checks) +                 │
│         VALIDATION_REPORT + rubric                                │
│   工具: codegraph_impact / callers / context / status (只读查询)   │
│   输出: verdict (PASS/NEED_FIX/NEED_HUMAN) + required_fixes        │
│   绝不: 跑测试 / 写文件 / git / 改文档                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 三条角色边界铁律

1. **测试是 Claude Code 的专属职责，Codex 永不执行测试。** Codex 审查时只读：读 diff、读 `VALIDATION_REPORT.md`、用 codegraph 查结构。`codex exec --sandbox read-only` 从机制上禁止 Codex 写文件/跑构建——省额度是天然结果。
2. **Codex 把"测试结果"当证据消费，不自己产出。** 谁跑测试 = Claude Code（Worker 按 TDD 写+跑；Orchestrator 独立复跑落到 `VALIDATION_REPORT.md`）。Codex 做审计，不做复测。
3. **要跑哪些测试，必须在任务包里提前说死。** `CURRENT_TASK.md` 强制新增字段 `acceptance_checks`（具体测试/lint/typecheck 命令清单），由 Orchestrator 派工时写明。

### 2.3 脏活归属

| 脏活 | 谁干 | 时机 |
|---|---|---|
| git add / commit（阶段边界） | Claude Orchestrator | 任务 PASS 且到阶段边界 |
| 更新 docs/ 项目文档、HANDOFF.md | Claude Orchestrator | 每轮任务循环后 |
| 更新 PROJECT_STATE.md（长期记忆） | Claude Orchestrator | 每轮任务循环后 |
| 更新 DECISION_LOG.md（记"为什么"） | Claude Orchestrator | 关键决策时 |
| 写代码 + 写测试 + 跑测试/lint/typecheck | Claude Worker | 任务执行时 |
| 写 WORK_REPORT.md | Claude Worker | 执行完成后 |

Codex 永远只做只读审查（读 diff + 查 codegraph + 出 verdict），不碰 git、不写文档、不跑测试、不记账。

### 2.4 核心组件清单（含现状盘点）

| 组件 | 形态 | 现状 | 第一版要做什么 |
|---|---|---|---|
| 协议层 `CLAUDE_ORCHESTRATOR_PROTOCOL.md` | Markdown 操作系统 | 已完成（420 行） | 补 3 条新铁律 |
| 启动入口 `START_ORCHESTRATOR.md` | 可复制提示词 | 已完成 | 补 readiness 前置检查 |
| 状态轨道 `.agent/*.md` + `RUN_STATE.json` | 文件协议 | 模板齐全 | 填真实内容 |
| 本地质量门 `scripts/validate_task.ps1` | PS 脚本 | 可跑（DryRun 验证过） | 修路径 bug + 编码 |
| Codex 审查 `scripts/codex_review.ps1` | PS 脚本 | DryRun 验证过，**未真实调用** | **首次真实调用 Codex + codegraph** |
| readiness 探测 `scripts/check_quality_readiness.ps1` | PS 脚本 | 可跑（正确报 BLOCKED） | 沿用 |
| 审查标准 `CODEX_REVIEW_RUBRIC.md` | Markdown | 已完成 | 补 codegraph 结构检查条目 |
| sandbox 示例项目 | 独立 git 仓库 | **不存在** | 新建（Phase B 验证对象） |

### 2.5 两层测试契约

```
QUALITY_GATES.json (全局默认门: test/lint/typecheck/coverage 命令 + 阈值)
        │  Orchestrator 派工时读取
        ▼
CURRENT_TASK.md.acceptance_checks (本任务具体要过哪几条命令)  ← 新增字段
        │  写明后分发
        ├──▶ Worker: 知道写什么测试、跑什么
        ├──▶ Orchestrator: 独立复跑这几条 → VALIDATION_REPORT.md
        └──▶ Codex: 只核对"声明的检查是否真过了"，不自己跑
```

### 2.6 关键设计决策（吸收调研结论）

1. **无状态 Orchestrator 思想（借 sisyphus）**：每轮循环开始强制重读 `BLUEPRINT + PROJECT_STATE + CURRENT_TASK`，用文件做满血上下文恢复，防长跑越偏。第一版靠"每轮重读"近似实现，不做真守护进程。
2. **Codex 审查用 codegraph 做影响面分析（核心需求）**：用 `codegraph_impact` 查"改动会破坏什么"，比纯文本 diff 审查强。
3. **配置极简（借 baton 教训）**：不引入 BEADS/SQLite，`.agent/*.md` + 一个 `RUN_STATE.json` 足够。

---

## 3. 端到端数据流（一个完整循环的时序）

### 3.1 主时序

```
[Orchestrator]
 1. 读 BLUEPRINT + PROJECT_STATE + RUN_STATE + TASK_QUEUE   ← 每轮强制重读(防越偏)
 2. 选一个 pending 任务，写 CURRENT_TASK.md
      · 关键: 填 file_scope + acceptance_checks(具体测试命令) + DoD
 3. 更新 RUN_STATE.json: phase=EXECUTE_TASK
      ▼ 派工(切 Worker 身份)
[Worker]
 4. 读 CURRENT_TASK.md
 5. TDD: 先写失败测试 → 再写实现 → 跑到测试通过
 6. 自跑 acceptance_checks 里的命令(test/lint/typecheck)
 7. 写 WORK_REPORT.md (做了什么/改了哪些文件/测试结果/是否偏离)
      ▼ 交回(切 Orchestrator 身份)
[Orchestrator] —— 不信任 Worker 自述，独立复跑
 8. 运行 validate_task.ps1:
      · 复跑 QUALITY_GATES + acceptance_checks 命令
      · git diff --name-only → 核对 file_scope(scope check)
      · 解析 coverage → 比对阈值
      · 写 VALIDATION_REPORT.md
 9. 若本地验证 FAIL → 回步骤 4 返修(retry_count+1)，不进 Codex
      ▼ 本地验证 PASS
10. TASK_QUEUE 里把当前任务标 review
11. 运行 codex_review.ps1:
      · 组装 prompt: BLUEPRINT + CURRENT_TASK + WORK_REPORT
                     + VALIDATION_REPORT + git diff + RUBRIC
      · codex exec --sandbox read-only --json -C <repo> "<prompt>"
      · prompt 指示 Codex: 先 codegraph_status 查索引新鲜度,
        再用 codegraph_impact/callers/context 做结构风险分析
      · 落 raw log + 解析 verdict → 写 CODEX_REVIEW.md
      ▼
12. HANDLE_REVIEW —— 见 3.2 三分支
```

### 3.2 verdict 三分支

**PASS**：TASK_QUEUE 标 done → 更新 PROJECT_STATE/DECISION_LOG/docs（脏活）→ RUN_STATE retry_count=0 → 到阶段边界则 git commit（只源码，不含 .agent/）→ 回步骤 1 选下一任务。

**NEED_FIX**：读 required_fixes → 生成针对性返修任务（不盲目重跑）→ retry_count+1，写入 fix_history[] → retry_count<=2 回步骤 4；retry_count>2 转 HUMAN_HANDOFF → STOP。重审时 fresh：不把上轮 CODEX_REVIEW 喂给 Codex（防锚定）。

**NEED_HUMAN**：写 HUMAN_HANDOFF.md（卡点/选项/推荐/风险）→ RUN_STATE phase=HUMAN_HANDOFF → STOP，等人类回复（GATE 不是通知）。

### 3.3 Codex 只读审查的内部数据流

```
codex_review.ps1 组装的审查包
        ▼
Codex 进程 (--sandbox read-only, 不能写文件/跑测试)
        ├─ 1. codegraph_status        → 索引新鲜吗? 哪些文件滞后?
        │                                滞后文件 → 回退读源码
        ├─ 2. codegraph_impact(改动符号) → 这次改动会破坏什么?
        ├─ 3. codegraph_callers(改动符号) → 谁依赖它? 影响面多大?
        ├─ 4. 读 git diff 文本           → 实际改了什么
        ├─ 5. 读 VALIDATION_REPORT       → Worker声称的测试结果(当证据,不复跑)
        └─ 6. 对照 CURRENT_TASK 的 DoD    → 每条 DoD 是否有 file:line 证据
        ▼
输出结构化 YAML:
   verdict / confidence / blocking_issues[] / required_fixes[]
   / non_blocking_suggestions[] / human_questions[] / next_action
        ▼  Orchestrator 解析
   CODEX_REVIEW.md
```

体现两条约束：Codex 全程只读查询（省额度）；测试结果由 Codex 当证据消费而非自己产出。

环境前提（已核实）：`~/.codex/config.toml` 已配置 `[mcp_servers.codegraph]`，声明了 status/search/context/explore/node 等工具，`command = "codegraph"`, `args = ["serve", "--mcp"]`。codegraph CLI 全局可用（0.9.7）。

### 3.4 停机与安全护栏（防 24h 乱跑）

任一条触发即写 `HUMAN_HANDOFF.md` 并 STOP：

| 触发条件 | 计数器 |
|---|---|
| 同任务 NEED_FIX 满 3 次 | retry_count > 2 |
| Codex 返回 NEED_HUMAN | — |
| 本地同一门连续失败 3 次 | consecutive_failures |
| 需删文件 / 改密钥 / 装依赖 | — |
| Worker 改了 file_scope 外的文件 | scope check FAIL |
| Codex 输出无法解析 verdict | — |
| 需要架构方向选择 | — |

git 护栏：只 commit，绝不 push / merge / force / --no-verify。

---

## 4. 分阶段实施计划

核心原则：先让协议机制全部"可运行"，再用真实任务验证护城河。

### Phase A：自举修复——把 24Hagent 变成"可运行环境"

| # | 任务 | 范围 | 验收 |
|---|---|---|---|
| A1 | git init + 首次基线 commit | 根目录 | （已完成）git status 正常；.gitignore 排除运行态；基线已 commit |
| A2 | 修 E2E 报告路径 bug | validate_task.ps1 或相关脚本 | QUALITY_GATE_E2E_REPORT.md 不再出现旧路径 D:\Codex\24Hagent，改为动态 repo root |
| A3 | 修 PowerShell 5.1 编码乱码 | 报告生成相关脚本 | 两份报告无 `鈥?`；统一 UTF-8 输出 |
| A4 | 填 PROJECT_BLUEPRINT.md | .agent/PROJECT_BLUEPRINT.md | 不再是空模板；写入本蓝图的目标/范围/阶段/禁止项 |
| A5 | 协议补 3 条新铁律 | CLAUDE_ORCHESTRATOR_PROTOCOL.md + CODEX_REVIEW_RUBRIC.md | 写入：①测试归 Claude ②Codex 只读 ③acceptance_checks 字段 + codegraph 审查条目 |

**Phase A 验收门（轻量，对象是脚本/文档）：** 所有脚本 DryRun 跑通、报告无乱码无错误路径；git log 有干净基线 + 阶段 commit。不强加 TDD/coverage——脚本/文档类改动用"脚本能跑+报告正确"作为门。

### Phase B：首次真实闭环——验证护城河（项目核心里程碑）

| # | 任务 | 验收 |
|---|---|---|
| B1 | 建 sandbox 示例项目 | 独立子目录/仓库：TS 小库（如字符串工具函数），含 vitest + git + 真实 package.json test/coverage 脚本。check_quality_readiness.ps1 对它返回 READY（非 BLOCKED） |
| B2 | Codex 真实调用冒烟测试 | codex_review.ps1 首次非 DryRun 调用，对已知 diff 返回真实 verdict；raw log 落盘；verdict 成功解析。**项目最大未知数的验证** |
| B3 | 跑通 PASS 路径 | 给 sandbox 简单任务（如加 slugify 函数 + 测试），Worker TDD 实现 → 本地门通过 → Codex 审查 PASS → 阶段 commit。全程 DECISION_LOG + git 历史可信 |
| B4 | 跑通 NEED_FIX 路径 | 故意构造缺陷任务，触发 Codex NEED_FIX → 生成返修任务 → 第二轮通过。验证返修闭环 + fresh reviewer |
| B5 | 验证 codegraph 审查生效 | B3/B4 某轮确认 Codex 真调用了 codegraph_impact/status 并把结构风险写进 CODEX_REVIEW.md（不只读 diff 文本） |

**Phase B 验收门（完整）：** sandbox 对 TDD + coverage 门真实可跑；Codex 真实返回过 PASS 和 NEED_FIX 各至少一次；codegraph 结构检查真实生效；留下可信 DECISION_LOG.md 和 git 提交历史。

> **B 完成 = "最终交付定义"达成。**

### Phase C：固化与轻量产品化（可选，B 通过后才启动）

| # | 任务 | 验收 |
|---|---|---|
| C1 | Phase 2C：readiness 写进启动入口 | START_ORCHESTRATOR.md 明确：BLOCKED 时禁止启动循环 |
| C2 | 回写 HANDOFF.md | 反映真实状态（Phase 2B 已完成、路径 bug 已修、B 闭环已验证） |
| C3 | 沉淀"如何用在新项目"短文档 | 一页纸：填蓝图 → readiness 检查 → 启动提示词。借 baton 极简配置思想 |

### 关键路径与风险前置

```
A1(git init✓) ─→ A2/A3(脚本修复) ─→ A4/A5(文档) ─→ [Phase A 门]
              └─────────────────────────────────────┐
                                                     ▼
        B1(sandbox) ─→ B2(Codex冒烟★) ─→ B3(PASS) ─→ B4(NEED_FIX) ─→ B5(codegraph)
                            │                                            │
                       最大风险点                                  [Phase B 门=交付]
```

**头号风险 = B2**：Codex 真实调用此前从未验证。建议 A1 完成后插队先做 B2 冒烟——若 Codex 调用有问题（认证/sandbox/输出格式），越早暴露越好。

---

## 5. 成功指标 · 风险登记

### 5.1 成功指标

**第一性指标（唯一硬指标）：** 24Hagent 在 sandbox 项目上无人干预跑通 ≥1 个完整循环，PASS 与 NEED_FIX 两条路径各真实触发 ≥1 次，Codex 为真实调用、codegraph 结构检查真实生效。

| 维度 | 指标 | 达标线 |
|---|---|---|
| 护城河 | Codex 真实 verdict 可被脚本稳定解析 | 连续 3 次调用 0 解析失败 |
| 纪律 | Orchestrator 独立复跑、不信 Worker 自述 | 100%（协议+脚本强制） |
| 安全 | 越界/高风险 → 停机而非硬干 | 停机条件 100% 触发，0 次冲过 HUMAN_HANDOFF |
| 省额度 | Codex 全程只读、不跑测试 | --sandbox read-only，0 次执行测试/构建 |
| 可恢复 | 中断后能从 RUN_STATE.json 恢复 | 模拟中断恢复成功 |

### 5.2 风险登记

| ID | 风险 | 等级 | 缓解 |
|---|---|---|---|
| R1 | Codex 真实调用从未验证（认证/sandbox/输出格式） | 高 | B2 插队前置：A1 后立即冒烟 |
| R2 | codegraph 索引滞后，Codex 审到旧结构 | 中 | 审查 prompt 强制先 codegraph_status，滞后文件回退读源码 |
| R3 | Codex 的 codegraph 工具集与 Claude 侧不完全一致 | 中 | rubric 只依赖 ~/.codex/config.toml 已声明的工具 |
| R4 | PowerShell 5.1 编码导致报告乱码反复出现 | 中 | A3 统一 UTF-8 写文件；后续脚本输出走同一封装 |
| R5 | 协议自洽但实跑卡壳（autobeat 警告） | 高 | 整个 Phase B 就是为消除此风险存在 |
| R6 | Pester 3.4 太旧，脚本难上单测 | 低 | 第一版脚本用 DryRun 行为验证，不强求脚本单测 |
| R7 | .agent/ 运行态文件误入 commit | 中 | A1 的 .gitignore 排除；commit 只含 file_scope 源码 |

### 5.3 已确认的关键决策

1. 交付形态 = 自用工作流，"做完" = 可观测真实闭环（非堆文档）
2. git init 已批准并已执行（基线 commit `5832146`）
3. Codex 永远只读审查，用 codegraph 做结构风险分析（双护城河）
4. 测试归 Claude Code，命令在 CURRENT_TASK.acceptance_checks 提前说死（省额度）
5. 脏活（git/docs/记账）全归 Claude Code
6. sandbox 验证项目 = TS + vitest 小库
7. B2 风险前置：A1 后插队冒烟测 Codex

### 5.4 砍掉的范围（YAGNI）

BEADS/SQLite · 多 Worker 并行/DAG · PR shepherd · 自动 push/merge · 真 daemon/24h 轮询 · Codex implement —— 全部推迟到第二阶段或永不做。

---

## 附录：GitHub 调研参考项目

| 项目 | 核心模式 | 对 24Hagent 的启示 |
|---|---|---|
| dean0x/autobeat | 框架只提供 agent 自己做不到的 4 原语，其余交给 agent | 警惕过度自建基础设施变技术债；先验证闭环 |
| mraza007/baton | 单个 WORKFLOW.md（YAML + Markdown 模板）控制一切 | 配置极简主义 |
| crouton-labs/sisyphus | 无状态 orchestrator + fresh respawn（Ralph loop 进阶） | 解决长跑上下文丢失/越偏 |
| agent-fox-dev/agent-fox | 专为 Claude 构建的编排器 | 印证方向有人在做 |

全部为同模型多实例编排。24Hagent 的 Codex 跨模型对抗审查是差异化护城河。
