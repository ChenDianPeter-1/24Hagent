# START_ORCHESTRATOR.md

这个文件包含启动 24Hagent Orchestrator 的可复制提示词。
选择下面一段提示词，直接复制到 Claude Code 输入框，即可进入对应的 Orchestrator 运行模式。

---

## 1. 完整启动：长期开发循环

适用场景：项目蓝图已写好，.agent/ 工作区已初始化，启动完整长期开发循环。

将以下内容复制到 Claude Code：

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
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1
   如果任何 blocking gate 失败，回到步骤 2 返修（retry_count + 1）。
6. 本地验证通过后，运行 Codex 对抗性审查：
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/codex_review.ps1
7. 读取 .agent/CODEX_REVIEW.md 中的 verdict：
   - PASS → 标记任务 done，更新 PROJECT_STATE.md 和 RUN_STATE.json，进入下一个任务。
   - NEED_FIX → 读取 required_fixes，创建返修任务，retry_count + 1。
     同一任务最多 2 次返修（共 3 次尝试）。超过则写 .agent/HUMAN_HANDOFF.md 并停止。
   - NEED_HUMAN → 立即写 .agent/HUMAN_HANDOFF.md 并停止。
8. TDD + 100% coverage 是 MVP 硬质量门，不是可选功能。
9. 阶段完成后执行 git commit（不 push，不 merge）。
10. 绝对禁止：
    - 自动 push 到远程仓库
    - 自动 merge 分支
    - 删除文件（除非人类明确批准）
    - 修改密钥、凭证、token
    - 安装/卸载依赖（除非人类明确批准）
    - 修改全局或用户级配置
    - 使用 --no-verify 跳过 git hooks
    - 使用 git push --force
    - 遇到 NEED_HUMAN 后继续执行
    - Codex 未 PASS 就进入下一个任务
11. 每轮循环结束后输出简短状态：当前任务、verdict、下一步。
12. 如果遇到任何安全停机条件，立即写 HUMAN_HANDOFF.md 并停止。

现在开始：读取上述所有文件，判断当前状态，然后按协议运行。
```

---

## 2. 恢复中断任务

适用场景：上次运行中途停止（如 HUMAN_HANDOFF 或上下文丢失），需要从当前状态恢复。

将以下内容复制到 Claude Code：

```text
请严格按照 CLAUDE.md 和 CLAUDE_ORCHESTRATOR_PROTOCOL.md 执行。

你现在进入 Claude-side Orchestrator 模式，执行恢复任务。

1. 读取以下文件判断当前状态：
   - CLAUDE_ORCHESTRATOR_PROTOCOL.md
   - .agent/PROJECT_BLUEPRINT.md
   - .agent/PROJECT_STATE.md
   - .agent/RUN_STATE.json
   - .agent/TASK_QUEUE.md
   - .agent/CURRENT_TASK.md
   - .agent/CODEX_REVIEW.md（如存在）
   - .agent/HUMAN_HANDOFF.md（如存在）

2. 根据 RUN_STATE.json 的 phase 和 retry_count 判断当前处于哪一步：
   - 如果 phase=EXECUTE_TASK 且 retry_count>0：这是返修，先读 CODEX_REVIEW.md 的 required_fixes
   - 如果 phase=HUMAN_HANDOFF：等待人类回复，不要自行决定
   - 如果 phase=ASK_CODEX_REVIEW：重新运行 scripts/codex_review.ps1（fresh review）
   - 如果 phase=INIT 或 READ_BLUEPRINT：按完整启动流程重新开始

3. 恢复执行后严格遵守：
   - 每次只执行一个 CURRENT_TASK
   - 每轮运行 scripts/validate_task.ps1
   - 每轮运行 scripts/codex_review.ps1
   - TDD + 100% coverage 硬门
   - PASS / NEED_FIX / NEED_HUMAN 三条路径
   - 最多 2 次返修
   - 安全停机条件
   - 不自动 push/merge

4. 输出当前状态摘要：任务、阶段、retry_count、上次 verdict。

现在开始：读取状态文件，判断当前进度，然后继续执行。
```

---

## 3. 从零初始化 .agent 工作区

适用场景：新项目，还没有 .agent/ 目录，需要 Orchestrator 初始化所有状态文件。

将以下内容复制到 Claude Code：

```text
请严格按照 CLAUDE.md 和 CLAUDE_ORCHESTRATOR_PROTOCOL.md 执行。

你现在进入 Claude-side Orchestrator 模式，执行初始化。

1. 读取 CLAUDE_ORCHESTRATOR_PROTOCOL.md 了解完整协议。

2. 检查 .agent/ 目录是否存在：
   - 如果不存在，根据协议中的文件模板初始化以下文件：
     a. .agent/PROJECT_BLUEPRINT.md —— 从用户获取或使用已有内容
     b. .agent/PROJECT_STATE.md —— 初始状态（空任务列表）
     c. .agent/TASK_QUEUE.md —— 根据 PROJECT_BLUEPRINT.md 生成初始任务列表
     d. .agent/CURRENT_TASK.md —— 暂不填充，等待选择第一个任务
     e. .agent/RUN_STATE.json —— 初始化为：
        {"active_task_id":null,"phase":"INIT","retry_count":0,"last_verdict":null,"consecutive_failures":0,"updated_at":"<当前时间>"}
     f. .agent/QUALITY_GATES.json —— 确认存在且包含 TDD + 100% coverage 配置
     g. .agent/CODEX_REVIEW_RUBRIC.md —— 确认存在

3. 初始化完成后：
   - 更新 .agent/DECISION_LOG.md 记录初始化决策
   - 输出初始化摘要：创建了哪些文件、第一个待执行任务是什么

4. 初始化完成后自动进入完整启动流程（见启动提示词第 1 段）。

现在开始：检查当前项目状态，初始化 .agent/ 工作区，生成任务队列。
```

---

## 快速参考：核心命令

| 命令 | 用途 |
|------|------|
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1` | 运行本地质量门 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/codex_review.ps1` | 调用 Codex 对抗性审查 |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_task.ps1 -DryRun` | 预览质量门命令（不真实运行） |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/codex_review.ps1 -DryRun` | 预览 Codex 审查包（不调用 Codex） |

## 关键文件列表

| 文件 | 谁维护 | 用途 |
|------|--------|------|
| `.agent/PROJECT_BLUEPRINT.md` | 人类 | 项目蓝图，战略输入 |
| `.agent/PROJECT_STATE.md` | Orchestrator | 长期记忆，当前进度 |
| `.agent/TASK_QUEUE.md` | Orchestrator | 任务队列 |
| `.agent/CURRENT_TASK.md` | Orchestrator | 当前任务，限制 Worker 范围 |
| `.agent/WORK_REPORT.md` | Worker | 执行报告 |
| `.agent/VALIDATION_REPORT.md` | validate_task.ps1 | 本地质量门结果 |
| `.agent/CODEX_REVIEW.md` | codex_review.ps1 | Codex 审查结果 |
| `.agent/CODEX_REVIEW_RUBRIC.md` | 人类（模板） | Codex 审查标准 |
| `.agent/QUALITY_GATES.json` | 人类（配置） | 质量门定义，含 100% coverage |
| `.agent/RUN_STATE.json` | Orchestrator | 机器可读当前状态 |
| `.agent/DECISION_LOG.md` | Orchestrator | 关键决策记录 |
| `.agent/HUMAN_HANDOFF.md` | Orchestrator | 人类交接（停机门） |
| `scripts/validate_task.ps1` | 脚本 | 执行本地验证 |
| `scripts/codex_review.ps1` | 脚本 | 组装审查包 + 调用 Codex |
| `CLAUDE_ORCHESTRATOR_PROTOCOL.md` | 协议 | Orchestrator 操作系统 |
