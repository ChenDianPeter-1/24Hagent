施工蓝图

目标产品：24Hagent 是一个 Claude-side Dual-Agent Loop Manager。

核心边界：

Claude Code Orchestrator：常驻调度者，读 .agent/ 状态、生成任务包、催促 Worker、调用 Codex 审查。
Claude Code Worker：受限执行者，只按 CURRENT_TASK.md 工作。
Codex：审查官，返回 PASS / NEED_FIX / NEED_HUMAN，不直接接管 Claude 的主循环。
文件系统：长期记忆和轨道，全部落在 .agent/。
Git：阶段检查点，只 commit，不自动 push/merge。
TDD/Coverage：MVP 内置硬质量门，支持 100% coverage，未达标不能 PASS。
建议最终目录：

.agent/
  PROJECT_BLUEPRINT.md
  PROJECT_STATE.md
  TASK_QUEUE.md
  CURRENT_TASK.md
  WORK_REPORT.md
  VALIDATION_REPORT.md
  CODEX_REVIEW.md
  DECISION_LOG.md
  HUMAN_HANDOFF.md
  RUN_STATE.json
  QUALITY_GATES.json
  CODEX_REVIEW_RUBRIC.md
CLAUDE_ORCHESTRATOR_PROTOCOL.md
scripts/
  codex_review.ps1
  validate_task.ps1
阶段计划

阶段 1：协议骨架
产物是能让 Claude Code 严格进入 Orchestrator 模式的文档系统。

写 CLAUDE_ORCHESTRATOR_PROTOCOL.md
写 .agent 文件模板
写 CODEX_REVIEW_RUBRIC.md
写 QUALITY_GATES.json，明确 TDD、test、lint、typecheck、coverage threshold
明确 PASS / NEED_FIX / NEED_HUMAN 判定规则
阶段 2：质量门 MVP
产物是本地验证链路，Codex 审查前必须先跑。

实现 scripts/validate_task.ps1
读取 QUALITY_GATES.json
支持发现并运行 test/lint/typecheck/coverage 命令
coverage 默认支持 100%，但命令按项目配置
输出 .agent/VALIDATION_REPORT.md
验证失败时禁止进入 Codex review
阶段 3：Codex 审查适配器
产物是 Claude Orchestrator 能自动把材料交给 Codex。

实现 scripts/codex_review.ps1
收集蓝图、状态、当前任务、工作报告、验证报告、git diff
调用 codex exec --sandbox read-only --json
保存 raw log
提取 verdict
写 .agent/CODEX_REVIEW.md
阶段 4：循环协议闭环
产物是可手动启动、自动跑到停机条件的 loop。

INIT -> READ_BLUEPRINT -> PLAN_PHASE -> GENERATE_TASK
EXECUTE_TASK -> VALIDATE_LOCALLY -> ASK_CODEX_REVIEW
PASS -> NEXT_TASK
NEED_FIX -> 返修，最多 2 次
NEED_HUMAN -> HUMAN_HANDOFF -> STOP
阶段 5：安全与恢复
产物是长时间运行不乱跑。

RUN_STATE.json 记录当前阶段、任务、retry count、last verdict
支持中断后恢复
高风险操作自动停机
阶段完成后允许本地 commit
不自动 push / merge / 删除 / 改密钥 / 装依赖
任务包颗粒

Task Pack 1：建立 .agent 工作区模板
范围：.agent/*.md、.agent/*.json
目标：定义蓝图、状态、任务队列、当前任务、报告、审查、人类交接的格式。
验收：每个文件有明确字段，Claude/Codex 都能读懂。

Task Pack 2：写 Orchestrator 协议
范围：CLAUDE_ORCHESTRATOR_PROTOCOL.md
目标：规定 Claude Orchestrator 怎么读状态、生成任务、调用 Worker、调用 Codex、处理 verdict。
验收：包含状态机、停机条件、返修上限、质量门、禁止事项。

Task Pack 3：写 Codex 审查 Rubric
范围：.agent/CODEX_REVIEW_RUBRIC.md
目标：把 metaswarm adversarial review 思想改成你的 PASS / NEED_FIX / NEED_HUMAN 格式。
验收：要求 evidence、blocking issues、required fixes、next_action。

Task Pack 4：实现质量门配置
范围：.agent/QUALITY_GATES.json
目标：把 100% coverage/TDD 作为 MVP 一等能力写进配置。
验收：有 tdd_required、coverage_required、coverage_threshold: 100、test/lint/typecheck/coverage 命令字段。

Task Pack 5：实现本地验证脚本
范围：scripts/validate_task.ps1
目标：读取质量门配置并生成 VALIDATION_REPORT.md。
验收：验证失败时输出清晰原因，coverage 不达标直接 blocking。

Task Pack 6：实现 Codex Review 脚本
范围：scripts/codex_review.ps1
目标：自动组装审查包并调用 Codex read-only review。
验收：能写 CODEX_REVIEW.md，并能解析 verdict。

Task Pack 7：写启动提示词
范围：README 或 START_ORCHESTRATOR.md
目标：以后你只复制一段话给 Claude Code，就能进入 Orchestrator 模式。
验收：提示词包含读取协议、初始化 .agent、每轮任务、质量门、Codex 审查、停机条件。

Task Pack 8：端到端模拟
范围：.agent 示例 + 脚本 dry run
目标：用一个假任务模拟 PASS / NEED_FIX / NEED_HUMAN 三种路径。
验收：状态文件更新正确，失败会停机，PASS 才能进入下一任务。

这版计划会把 100% coverage/TDD 保留为 MVP 核心能力，但不会让第一步就陷进全平台复杂度里。开工顺序建议从 Task Pack 1-4 开始，先把轨道铺正，再接脚本和真实循环。