# 24Hagent Handoff

更新时间：2026-05-28

## 当前目标

本项目目标是构建 `24Hagent`：一个 Claude Code 内部常驻调度 Agent。

核心分工：

- Human：项目老板，只在战略输入和高风险节点出现。
- Claude-side Orchestrator：常驻项目经理，读取 `.agent/` 状态、生成任务、调用 Worker、运行本地质量门、调用 Codex 审查、决定继续/返修/停机。
- Claude Code Worker：施工队，只执行 `CURRENT_TASK.md` 规定的单个任务，不得越界。
- Codex：外部审查官，返回 `PASS / NEED_FIX / NEED_HUMAN`。

核心原则：

- 每次只执行一个 `CURRENT_TASK`。
- Worker 完成后必须先过本地质量门。
- 本地质量门未通过，不得进入 Codex review。
- Codex 未 `PASS`，不得进入下一任务。
- TDD + 100% coverage 是 MVP 硬质量门。
- `NEED_FIX` 最多 2 次返修；超过写 `HUMAN_HANDOFF.md` 并停止。
- `NEED_HUMAN` 必须写 `HUMAN_HANDOFF.md` 并停止。
- 不自动 push/merge，不删除文件，不改密钥，不装依赖，不改全局配置，除非人类明确批准。

## 已完成阶段

### Phase 0：调研

完成内容：

- 阅读 `mvp.md`。
- 深入调研本地 `metaswarm/` 仓库。
- 输出 `metaswarm-investigation-report.md`。

关键结论：

- metaswarm 不适合原样照搬。
- 应借用其 4-phase loop、adversarial review、fresh reviewer、独立验证、human escalation。
- 24Hagent 保留自己的 `.agent/` 文件协议和 Claude-side Orchestrator 形态。

### Phase 1：协议骨架

完成内容：

- 创建 `.agent/` 工作区模板。
- 创建 `CLAUDE_ORCHESTRATOR_PROTOCOL.md`。
- 创建 `CODEX_REVIEW_RUBRIC.md`。
- 创建 `QUALITY_GATES.json`。
- 创建 `START_ORCHESTRATOR.md`。
- 完成端到端模拟 `.agent/SIMULATION_REPORT.md`。
- 根据模拟结果完成协议硬化。

关键文件：

- `.agent/PROJECT_BLUEPRINT.md`
- `.agent/PROJECT_STATE.md`
- `.agent/TASK_QUEUE.md`
- `.agent/CURRENT_TASK.md`
- `.agent/WORK_REPORT.md`
- `.agent/VALIDATION_REPORT.md`
- `.agent/CODEX_REVIEW.md`
- `.agent/DECISION_LOG.md`
- `.agent/HUMAN_HANDOFF.md`
- `.agent/RUN_STATE.json`
- `.agent/QUALITY_GATES.json`
- `.agent/CODEX_REVIEW_RUBRIC.md`
- `CLAUDE_ORCHESTRATOR_PROTOCOL.md`
- `START_ORCHESTRATOR.md`

协议硬化已完成：

- `TASK_QUEUE.md` 增加 `review` 状态使用规则。
- `RUN_STATE.json` 增加 `fix_history: []`。
- `TASK_QUEUE.md` 增加 `Phase Boundary` 列。
- `CODEX_REVIEW_RUBRIC.md` 增加 required fixes 合并规则。
- 协议明确：
  - `retry_count` 用于 Codex `NEED_FIX` 计数。
  - `consecutive_failures` 用于本地验证 gate 连续失败计数。

### Phase 2：质量门 MVP

已完成：

- Task Pack 2A：质量门探测 + 配置建议。
- Task Pack 2B：验证脚本增强 + 端到端 DryRun。

关键文件：

- `scripts/check_quality_readiness.ps1`
- `scripts/validate_task.ps1`
- `.agent/QUALITY_READINESS_REPORT.md`
- `.agent/QUALITY_GATES_SUGGESTED.json`
- `.agent/QUALITY_GATE_E2E_REPORT.md`

当前项目质量门状态：

- Readiness verdict：`BLOCKED`
- 原因：
  - `package.json` 只有 npm 默认占位测试脚本。
  - 没有真实 test runner。
  - 没有 linter。
  - 没有 coverage tool。
- 这符合预期：当前项目还没有实际工具链，质量门探测必须阻止假通过。

重要修复：

- `check_quality_readiness.ps1` 已能识别 npm 默认占位测试脚本：
  - `echo "Error: no test specified" && exit 1`
  - 不会再把它当成可用 test command。
- `validate_task.ps1` 已支持：
  - `-ReadinessPath`
  - `-E2EReportPath`
  - `-ReadinessCheck`
  - `-GenerateE2EReport`
  - gate 状态：`PASS / FAIL / SKIPPED / DRY_RUN / UNAVAILABLE / PARSE_FAILED`
  - readiness blocked 时生成清晰报告。
  - 非 git repo 时 file scope check 标记为 `UNAVAILABLE`。

待修小问题：

- `validate_task.ps1` 生成的报告中有 PowerShell 5.1 编码乱码：`鈥?`。
- DryRun 的 File Scope Check 当前显示：
  - `Scope check status: DRY_RUN`
  - 但 `All within scope: NO`
- 这应改成：
  - `All within scope: N/A (dry run)`

## Codex Review Adapter 状态

Task Pack 6 已完成并通过返修。

关键文件：

- `scripts/codex_review.ps1`
- `.agent/codex-review-prompt.md`
- `.agent/codex-review-raw.jsonl`

能力：

- `-DryRun` 生成审查包，不调用 Codex。
- 非 DryRun 使用 PowerShell call operator 调用：
  - `& codex exec --sandbox read-only --json -C $repoRoot $prompt`
- 支持 `-RawInputPathForTest` 做 fake raw output 解析测试。
- 能解析：
  - `verdict`
  - `confidence`
  - `blocking_issues`
  - `required_fixes`
  - `non_blocking_suggestions`
  - `human_questions`
  - `next_action`
- 如果 `NEED_FIX` 但没有 actionable fixes，会转为 `ask_human`。

注意：

- 当前没有真实调用 Codex 的验收，因为本环境未确认 Codex CLI 可用。
- DryRun 和 fake YAML 解析已验证通过。

## 当前建议下一步

先做一个小返修，再继续 Phase 2C。

### 下一任务：Phase 2B 小返修

目标：

- 修复 `validate_task.ps1` 报告输出。

范围：

- 允许读写：
  - `scripts/validate_task.ps1`
  - `.agent/VALIDATION_REPORT.md`
  - `.agent/QUALITY_GATE_E2E_REPORT.md`
- 不允许改：
  - `.agent/QUALITY_GATES.json`

要求：

- 不要在报告字符串里使用 em dash 等容易乱码的特殊标点；用 ASCII hyphen。
- DryRun 下 File Scope Check 应显示：
  - `Scope check status: DRY_RUN`
  - `All within scope: N/A (dry run)`
- 非 git repo 下应显示：
  - `Scope check status: UNAVAILABLE`
  - `All within scope: N/A (not a git repo)`
- PASS 时才显示：
  - `All within scope: YES`
- FAIL 时才显示：
  - `All within scope: NO`
- 重新生成：
  - `.agent/VALIDATION_REPORT.md`
  - `.agent/QUALITY_GATE_E2E_REPORT.md`

验收命令：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1 -DryRun -GenerateE2EReport
```

验收标准：

- `.agent/VALIDATION_REPORT.md` 不含 `鈥?`
- `.agent/QUALITY_GATE_E2E_REPORT.md` 不含 `鈥?`
- DryRun 下显示 `All within scope: N/A (dry run)`
- `.agent/QUALITY_GATES.json` 未修改
- 不运行真实 test/lint/typecheck/coverage

### 之后任务：Phase 2C

目标：

- 更新 `START_ORCHESTRATOR.md` 或新增 docs 说明，把质量门 readiness/check 流程写入启动入口。

建议内容：

- 首次使用前运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
```

- 如果 readiness 是 `BLOCKED`，不得启动真实 Orchestrator 循环。
- 必须先配置真实 test/lint/coverage 工具链。
- `QUALITY_GATES_SUGGESTED.json` 只是建议，不自动覆盖 `QUALITY_GATES.json`。
- 100% coverage 是默认硬门，不因工具缺失自动降级。

## 新窗口启动建议

新窗口开始后，先读：

1. `AGENT.md`
2. `CLAUDE.md`
3. `docs/HANDOFF.md`
4. `CLAUDE_ORCHESTRATOR_PROTOCOL.md`
5. `.agent/QUALITY_READINESS_REPORT.md`
6. `.agent/QUALITY_GATE_E2E_REPORT.md`

然后继续：

1. 复核当前状态。
2. 执行 Phase 2B 小返修。
3. 再进入 Phase 2C。

## 当前注意事项

- 根目录不是 git 仓库，不能依赖 `git diff` 验证变更。
- `.agent/` 当前包含运行态文件和模拟文件。
- `.agent/_simulation/` 是 Task Pack 8 的模拟数据。
- `workmap.md` 是早期工作规划文件，保留不动。
- `docs/` 是新建的交接目录。
- 如果要让 Claude Code 继续执行，保持 Codex/controller、Claude/executor 分工。
