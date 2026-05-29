# 24Hagent 实施计划（Phase A + Phase B）

实施计划 | 创建于 2026-05-29 | 配套 spec：`docs/superpowers/specs/2026-05-29-24hagent-delivery-blueprint-design.md`

---

## 计划总览

本计划把蓝图的 Phase A（自举修复）和 Phase B（首次真实闭环）展开为可逐步执行的任务。
**执行顺序按风险前置调整**：A1 完成后立即插入 B2（Codex 真实调用冒烟），尽早暴露最大未知数，再回头补完 Phase A 其余任务。

### 执行顺序

```
A1 (git init) ✓已完成
   ↓
B2-smoke (Codex 真实调用冒烟) ★风险前置
   ↓
A2 (修路径 bug) → A3 (修编码) → A4 (填蓝图) → A5 (补协议铁律)
   ↓
[Phase A 验收门]
   ↓
B1 (建 sandbox) → B3 (PASS 路径) → B4 (NEED_FIX 路径) → B5 (codegraph 验证)
   ↓
[Phase B 验收门 = 交付达成]
```

### 任务状态追踪

| 任务 | 状态 | 依赖 |
|---|---|---|
| A1 git init + 基线 commit | ✅ 已完成（commit 5832146） | — |
| B2-smoke Codex 真实调用冒烟 | ⬜ 待办（风险前置） | A1 |
| A2 修 E2E 报告路径 bug | ⬜ 待办 | A1 |
| A3 修 PowerShell 5.1 编码乱码 | ⬜ 待办 | A1 |
| A4 填 PROJECT_BLUEPRINT.md | ⬜ 待办 | — |
| A5 协议补 3 条新铁律 | ⬜ 待办 | — |
| B1 建 sandbox 示例项目 | ⬜ 待办 | Phase A 门 |
| B3 跑通 PASS 路径 | ⬜ 待办 | B1, B2-smoke |
| B4 跑通 NEED_FIX 路径 | ⬜ 待办 | B3 |
| B5 验证 codegraph 审查生效 | ⬜ 待办 | B3 或 B4 |

---

## B2-smoke：Codex 真实调用冒烟测试（风险前置）★

**为什么先做**：这是项目最大未知数（R1+R5）。Codex 的真实调用、sandbox 行为、JSON 输出格式、verdict 解析此前从未验证。若有问题，越早暴露越好——不要等 Phase A 全部做完才发现护城河跑不通。

**目标**：用一个已知的最小 diff，让 `codex_review.ps1` 首次非 DryRun 真实调用 Codex，确认能拿到可解析的 verdict。

**前提核实（执行前先跑）**：
- `codex --version` → 应返回 `codex-cli 0.134.0`（已确认）
- `codex exec --help` → 确认 `--sandbox read-only --json -C` 参数仍受支持
- 确认 Codex 已认证（能真实调用，不只是 CLI 存在）

**执行步骤**：
1. 先读 `scripts/codex_review.ps1` 的完整 DryRun 路径，理解它如何组装 prompt 和解析输出。
2. 在当前 24Hagent 仓库（已有 git）上，用 `-DryRun` 先跑一遍，确认审查包能正常组装：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/codex_review.ps1 -DryRun
   ```
3. 制造一个**最小可审查 diff**：在 sandbox 或当前仓库做一处微小改动（如给某脚本加一行注释），让 `git diff` 非空。
4. 非 DryRun 真实调用：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/codex_review.ps1
   ```
5. 检查产物：`.agent/CODEX_REVIEW.md` 是否生成、verdict 是否被成功解析、raw log（`.agent/codex-review-raw.jsonl`）是否落盘。

**验收标准**：
- Codex 真实返回了输出（非超时、非认证失败）
- raw log 落盘
- `CODEX_REVIEW.md` 含可解析的 `verdict` 字段
- **若失败**：记录确切错误（认证/参数/输出格式/超时），写入 DECISION_LOG，作为后续修复 codex_review.ps1 的依据——这本身就是有价值的验证结果

**风险与回退**：若 Codex 调用方式与脚本假设不符（如 `--json` 输出结构变化），先记录真实输出样本，再决定是修脚本解析逻辑还是调整调用参数。不要为了"让它通过"而 mock 数据。

**stop rule**：若 Codex 认证/网络不可用且无法在本环境解决，停下来写 HUMAN_HANDOFF 风格的记录，等用户决定。

---

## A2：修 E2E 报告路径 bug

**根因（已定位）**：`scripts/validate_task.ps1`
- 第 126 行：`$ReportPath = [System.IO.Path]::GetFullPath($ReportPath)` 把相对路径解析为**运行时工作目录的绝对路径**
- 第 521 行：`$e2eLines += "- Validation report: $ReportPath"` 把这个绝对路径嵌进 E2E 报告
- 结果：报告里出现 `D:\Codex\24Hagent\...`（上次在旧目录运行残留），换目录即失效

**目标**：E2E 报告里的路径引用改为**相对仓库根**，不嵌入机器特定绝对路径。

**文件范围**：`scripts/validate_task.ps1`、（重新生成）`.agent/VALIDATION_REPORT.md`、`.agent/QUALITY_GATE_E2E_REPORT.md`

**执行步骤**：
1. 决定路径呈现策略：E2E 报告的 "Files Referenced" 段统一用相对路径（如 `.agent/VALIDATION_REPORT.md`），而非 `GetFullPath` 后的绝对路径。
2. 修改第 521 行附近：把 `$ReportPath`（绝对）替换为相对展示值。可保留内部 `GetFullPath` 用于写文件，但**报告文本里用相对路径**。
3. 重新生成报告：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1 -DryRun -GenerateE2EReport
   ```

**验收标准**：
- `.agent/QUALITY_GATE_E2E_REPORT.md` 不再出现 `D:\Codex\24Hagent` 或任何机器特定绝对路径
- 路径引用为相对仓库根的形式
- `QUALITY_GATES.json` 未被修改

---

## A3：修 PowerShell 5.1 编码乱码

**根因**：PowerShell 5.1 默认输出编码非 UTF-8，导致报告中特殊标点（em dash 等）变成 `鈥?`。HANDOFF 记录此问题在 Phase 2B 已部分修复，但需确认根除。

**目标**：所有脚本生成的报告统一 UTF-8（无 BOM 优先），无 `鈥?` 乱码。

**文件范围**：`scripts/validate_task.ps1`（及其他写报告的脚本中的 `Write-FileSafe` 封装）

**执行步骤**：
1. 检查 `Write-FileSafe` 函数当前的写文件编码（`validate_task.ps1` 第 84 行附近）。
2. 确保用显式 UTF-8 编码写文件（如 `[System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))`）。
3. 报告字符串内**避免 em dash 等易乱码标点**，改用 ASCII hyphen（蓝图与 HANDOFF 已有此约束）。
4. 重新生成两份报告并 grep 检查。

**验收标准**：
- `.agent/VALIDATION_REPORT.md` 与 `.agent/QUALITY_GATE_E2E_REPORT.md` 均不含 `鈥?`
- 报告可被 UTF-8 正常读取

**注意**：A2 与 A3 都改 `validate_task.ps1` 并都重新生成报告，建议**合并为一次执行**（先改两处代码，再一次性重新生成报告验收），减少重复跑脚本。

---

## A4：填 PROJECT_BLUEPRINT.md

**现状**：`.agent/PROJECT_BLUEPRINT.md` 是空模板（只有 HTML 注释占位）。Orchestrator 每轮都读它，空模板会导致无法生成有意义的任务队列。

**目标**：用本交付蓝图的内容填充真实的项目蓝图。

**文件范围**：`.agent/PROJECT_BLUEPRINT.md`

**执行步骤**：按模板的章节填入：
- **Project Goal**：从 spec 第 1 段「一句话定位」
- **MVP Scope（In/Out）**：In = 真实闭环验证；Out = spec 第 1 段「明确不做」清单
- **User Requirements**：Claude 主控 + Codex 只读审查 + 防 agent 自嗨
- **Technical Boundaries**：Windows + PowerShell 5.1 + node 20 + Codex CLI + codegraph；测试归 Claude，Codex 只读
- **Phase Goals 表**：Phase A 自举 / Phase B 真实闭环 / Phase C 固化
- **Acceptance Criteria**：spec 第 5.1「第一性指标」
- **Prohibited Actions**：保留模板已有 6 条 + 补「Codex 不跑测试/不写文件」

**验收标准**：
- 文件不再含 HTML 注释占位符
- 各章节有实质内容，与 spec 一致
- 注意 `.agent/` 被 gitignore，此文件不进 commit（属运行态）

---

## A5：协议补 3 条新铁律

**目标**：把蓝图确立的 3 条角色边界铁律写进协议文档与审查标准。

**文件范围**：`CLAUDE_ORCHESTRATOR_PROTOCOL.md`、`.agent/CODEX_REVIEW_RUBRIC.md`

**执行步骤**：
1. 在 `CLAUDE_ORCHESTRATOR_PROTOCOL.md` 的「Codex Review Protocol」段补充：
   - 铁律：Codex 只读审查，永不执行测试/构建/写文件（`--sandbox read-only`）
   - Codex 把 VALIDATION_REPORT 当证据消费，不复测
2. 在「Worker Dispatch」或「File Contract」段补充：
   - `CURRENT_TASK.md` 新增必填字段 `acceptance_checks`（具体测试/lint/typecheck 命令清单）
   - 测试归 Claude Code（Worker 写+跑，Orchestrator 复跑）
3. 在 `CODEX_REVIEW_RUBRIC.md` 补充 codegraph 结构检查条目：
   - 审查前先 `codegraph_status` 查索引新鲜度，滞后文件回退读源码
   - 用 `codegraph_impact` / `codegraph_callers` 做结构性影响面分析
   - 只依赖 `~/.codex/config.toml` 已声明的工具（status/search/context/explore/node）

**验收标准**：
- 协议文档含 3 条铁律的明确表述
- rubric 含 codegraph 审查步骤
- `CLAUDE_ORCHESTRATOR_PROTOCOL.md` 在仓库内（会进 commit），`CODEX_REVIEW_RUBRIC.md` 在 `.agent/`（运行态，不进 commit）——注意两者 commit 归属不同

---

## Phase A 验收门

全部 A 任务完成后，验证：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1 -DryRun -GenerateE2EReport` 跑通
- 两份报告无 `鈥?`、无机器特定绝对路径
- `PROJECT_BLUEPRINT.md` 已填实
- 协议含 3 条铁律
- `git log` 有干净的阶段 commit（只含源码：脚本、协议文档；不含 `.agent/`）

**阶段 commit**（Orchestrator 脏活）：提交 `scripts/*.ps1` 和 `CLAUDE_ORCHESTRATOR_PROTOCOL.md` 的修改，commit message 引用 Phase A 完成的任务。

---

## B1：建 sandbox 示例项目

**目标**：建一个真实带测试+git 的最小项目，作为 Phase B 闭环的验证对象。

**文件范围**：新建独立子目录（建议 `sandbox/string-utils/`，或独立于 24Hagent 仓库的目录——需确认是否嵌套 git 仓库）

**执行步骤**：
1. 决定 sandbox 位置（子目录还是平级目录），并确认 git 策略（嵌套仓库 vs 独立仓库）——**这是一个需要用户拍板的小决策点**，执行时确认。
2. 初始化 TS 小库：`package.json`（含真实 `test` / `coverage` 脚本）、vitest 配置、一个待实现的占位模块、git init。
3. 跑 readiness 检查：
   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
   ```

**验收标准**：
- `check_quality_readiness.ps1` 对 sandbox 返回 **READY**（非 BLOCKED）
- vitest 能真实运行、产出 coverage
- 注意：建 sandbox 需要 `npm install`（装依赖）——**这是受限操作，执行前需用户批准**

**stop rule**：装依赖前停下来征得批准（项目硬规则：不擅自装依赖）。

---

## B3：跑通 PASS 路径

**目标**：用 24Hagent 完整跑一次成功的任务循环。

**执行步骤**：
1. Orchestrator 给 sandbox 写一个简单任务到 `CURRENT_TASK.md`（如「实现 slugify 函数」），填 file_scope + acceptance_checks + DoD。
2. Worker 身份：TDD 先写失败测试 → 实现 → 跑测试通过 → 写 WORK_REPORT。
3. Orchestrator 身份：跑 `validate_task.ps1` 独立复跑质量门。
4. 本地通过后跑 `codex_review.ps1` 真实审查。
5. Codex 返回 PASS → 标 done、更新 PROJECT_STATE/DECISION_LOG → 阶段 commit。

**验收标准**：全流程无人干预跑通，DECISION_LOG + git 历史可信，Codex 真实返回 PASS。

---

## B4：跑通 NEED_FIX 路径

**目标**：验证返修闭环 + fresh reviewer 规则。

**执行步骤**：
1. 故意构造一个有缺陷的任务（如 Worker 漏处理边界条件，或 DoD 未完全满足）。
2. 跑完整循环 → Codex 应返回 NEED_FIX + required_fixes。
3. Orchestrator 生成针对性返修任务（不盲目重跑）→ retry_count+1。
4. 第二轮 Worker 修复 → 重新审查（fresh：不喂上轮 CODEX_REVIEW）→ PASS。

**验收标准**：NEED_FIX 真实触发、返修任务正确生成、第二轮通过、fresh reviewer 规则生效（审查 prompt 不含上轮结果）。

---

## B5：验证 codegraph 审查生效

**目标**：确认 Codex 真的用了 codegraph 做结构检查，不只是读 diff 文本。

**执行步骤**：在 B3 或 B4 的某轮，检查 `.agent/CODEX_REVIEW.md` 和 raw log，确认 Codex 调用了 `codegraph_status` / `codegraph_impact` 等工具，并把结构性风险写进了审查结论。

**验收标准**：审查记录中有 codegraph 工具调用的证据，结构风险分析体现在 verdict/blocking_issues 里。

---

## Phase B 验收门 = 交付达成

- sandbox 对 TDD + coverage 门真实可跑
- Codex 真实返回过 PASS 和 NEED_FIX 各至少一次
- codegraph 结构检查真实生效
- 留下可信的 DECISION_LOG.md 和 git 提交历史

**达成即满足 spec 第 1 段「最终交付定义」。** Phase C（固化/产品化）为可选后续。

---

## 跨任务的安全约束（每个任务都适用）

- 不 push / merge / force / --no-verify
- 不删文件、不改密钥（除非用户批准）
- **不装依赖**（B1 的 npm install 需先批准）
- Worker 不越 file_scope
- 遇停机条件写 HUMAN_HANDOFF 并停止
- 每个改 `validate_task.ps1` 的任务都要重新生成报告并验收无乱码/无绝对路径
