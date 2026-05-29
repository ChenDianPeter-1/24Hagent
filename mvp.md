最终目标：Claude Code 内部的常驻调度 Agent

因为现在能力边界是：

Claude Code 可以主动跟 Codex 通信
Codex 不能反过来直接控制 Claude Code

所以系统主控权必须放在 Claude Code 侧。

也就是说，不是：

Codex 控制 Claude Code

而是：

Claude Code 内部启动一个 Orchestrator Agent
这个 Agent 负责：
1. 读项目蓝图
2. 拆当前任务
3. 调 Claude Code 自己执行
4. 调 Codex 审核
5. 根据 Codex 审核结果继续返修或进入下一步
6. 循环运行

更准确地说：

Claude Code = 主运行环境
Codex = 外部审查工具
Orchestrator Agent = Claude Code 里的项目经理
你真正要做的不是“双 Agent 对话”，而是“Claude Code 驱动 Codex”

最终结构应该是：

你写好项目蓝图文档
        ↓
在 Claude Code 里启动 long-running agent
        ↓
Agent 读取项目蓝图、状态文件、阶段计划
        ↓
Agent 调用 codex生成当前任务包
        ↓
Claude Code 执行任务
        ↓
Agent 写执行报告
        ↓
Agent 调 Codex 审核
        ↓
Codex 返回 PASS / NEED_FIX / NEED_HUMAN
        ↓
Agent 根据结果继续：
   PASS → 让claude code下一个任务
   NEED_FIX → 让claude code返修

这时 Codex 不再是“总经理”，而是：

Codex = 审计官 / 质检员 / 反对派 / 第二大脑

Claude Code 里的 Orchestrator 是一个非常勤奋的24小时在线的agent，他负责催促两个agent系统工作，本身能力比不上codex，但是极致勤奋

新角色分工
1. 你：项目老板

你只负责启动前的战略输入：

PROJECT_BLUEPRINT.md

里面写：

项目目标
MVP 范围
用户需求
技术边界
阶段目标
验收标准
禁止事项

你不需要每个任务都手动复制。

2. Claude Code Orchestrator：常驻项目经理

这是整个系统的核心。

它负责：

读取蓝图
判断状态
维护claude code和codex之间的通信

它不是普通 Claude Code，而是带一套工作协议的 Claude Code。

3. Claude Code Worker：施工队

实际上还是 Claude Code 自己干活。

但你要在提示词里把它区分成两个身份：

Orchestrator 模式：调用 Codex、判断流程、催促工作
Worker 模式：只执行当前任务，不擅自扩大范围

虽然底层可能是同一个 Claude Code 实例，但逻辑上要分开。

4. Codex：审查官

Codex  负责主控和审核。

它每次收到：

当前任务包
Claude 执行报告
PROJECT_STATE.md
git diff
测试结果
关键文件摘要之后

进行审核：
审核claude code是否严格按照任务包执行，是否完成对应任务目标


然后返回：

PASS
NEED_FIX
NEED_HUMAN

Codex 的职责是发现：

是否偏离蓝图
是否漏做任务
是否破坏已有功能
是否有明显代码风险
是否需要返修
最终系统形态

你要做的东西可以叫：

Claude-side Dual-Agent Loop Manager

也就是：

Claude Code 常驻主控
Codex 外部审核
项目文件作为长期记忆
Git 作为阶段检查点
你作为最终决策人

整体流程：

PROJECT_BLUEPRINT.md
        ↓
CLAUDE_ORCHESTRATOR.md
        ↓
PROJECT_STATE.md
        ↓
TASK_QUEUE.md
        ↓
CURRENT_TASK.md
        ↓
Claude Code 执行
        ↓
WORK_REPORT.md
        ↓
Codex Review
        ↓
CODEX_REVIEW.md
        ↓
Loop Decision
项目文件应该这样设计

你不需要搞太多复杂文件，最终版建议保留这些：

.agent/
  PROJECT_BLUEPRINT.md
  PROJECT_STATE.md
  TASK_QUEUE.md
  CURRENT_TASK.md
  WORK_REPORT.md
  CODEX_REVIEW.md
  DECISION_LOG.md
  HUMAN_HANDOFF.md
PROJECT_BLUEPRINT.md

你写的总蓝图。

作用：

告诉 Agent 这个项目最终要成为什么
哪些事情优先
哪些事情禁止
什么叫完成
PROJECT_STATE.md

Claude Orchestrator 每轮都要更新。

作用：

记录当前进度
已完成任务
当前阶段
已知问题
技术约束
下一步方向

这是系统的长期记忆核心。

TASK_QUEUE.md

由 Claude Orchestrator 根据蓝图自动生成和维护。

作用：

存放待执行任务
每个任务有状态：
- pending
- in_progress
- review
- fix_required
- done
- blocked
CURRENT_TASK.md

当前正在执行的任务。

作用：

限制 Claude Code 本轮只能做这一件事
防止越界开发
WORK_REPORT.md

Claude Code 每次执行后生成。

包括：

本轮做了什么
修改了哪些文件
如何测试
测试结果如何
遇到的问题
是否偏离原计划
下一步建议
CODEX_REVIEW.md

Codex 返回的审核结果。

必须结构化：

verdict: PASS / NEED_FIX / NEED_HUMAN

blocking_issues:
- ...

non_blocking_suggestions:
- ...

required_fixes:
- ...

next_action:
- continue_next_task / fix_current_task / ask_human
DECISION_LOG.md

记录关键决策。

例如：

为什么选择这个技术方案
为什么跳过某个功能
为什么接受某个风险
为什么进入下一阶段

这个文件以后非常重要，因为长时间跑 Agent 最容易丢失“为什么”。

HUMAN_HANDOFF.md

当 Agent 卡住时写这个文件。

内容是：

当前卡在哪里
需要你决定什么
可选方案 A/B/C
推荐方案
不决定会有什么风险

这样它不是半夜乱改，而是停下来等你。

关键控制逻辑

你这个 24 小时 Agent 不能真的“无限干”。

它必须是有刹车的长循环。

我建议规则是：

每次只执行一个 CURRENT_TASK
每次执行后必须 Codex 审核
没有 PASS 不准进入下一个任务
连续返修 2 次失败，必须 HUMAN_HANDOFF
涉及核心架构变化，必须 HUMAN_HANDOFF
涉及删除大量文件，必须 HUMAN_HANDOFF
涉及密钥、支付、账号、网络权限，必须 HUMAN_HANDOFF
阶段完成后必须 git commit

这才安全。

循环状态机

你可以让 Claude Code 的 Orchestrator 按这个状态机跑：

INIT
  ↓
READ_BLUEPRINT
  ↓
PLAN_PHASE
  ↓
GENERATE_TASK
  ↓
EXECUTE_TASK
  ↓
WRITE_REPORT
  ↓
ASK_CODEX_REVIEW
  ↓
HANDLE_REVIEW
     ├── PASS → MARK_TASK_DONE → NEXT_TASK
     ├── NEED_FIX → GENERATE_FIX_TASK → EXECUTE_TASK
     └── NEED_HUMAN → WRITE_HUMAN_HANDOFF → STOP
  ↓
PHASE_REVIEW
  ↓
GIT_COMMIT
  ↓
NEXT_PHASE

这就是你要的“二十四小时工作 agent”的骨架。

重点不是二十四小时，而是它有能力长期连续运行而不乱跑。

Codex 在里面怎么用

Codex 不需要拥有控制权。

Claude Orchestrator 每次把一包材料丢给 Codex：

请你作为外部审查员审核本轮工作。

你将收到：
1. PROJECT_BLUEPRINT.md
2. PROJECT_STATE.md
3. CURRENT_TASK.md
4. WORK_REPORT.md
5. git diff
6. 测试结果

你只能返回：
PASS / NEED_FIX / NEED_HUMAN

Codex 返回后，Claude Orchestrator 自己决定执行：

PASS → 下一个任务
NEED_FIX → 把 required_fixes 变成返修任务
NEED_HUMAN → 停机交接

这就是“Claude Code 能和 Codex 通信”的正确利用方式。

你需要写的不是普通 AGENTS.md，而是运行协议

你应该给 Claude Code 一个专门文件：

CLAUDE_ORCHESTRATOR_PROTOCOL.md

它里面不是普通的编码规范，而是规定这个 Agent 怎么跑。

核心内容包括：

你是 Claude-side Orchestrator
你必须持续读取 .agent 文件
你必须每轮更新 PROJECT_STATE.md
你必须每轮调用 Codex 审核
你不能在 Codex 未通过时进入下一个任务
你不能无限返修
你必须在高风险场景停下来问用户

这个文件就是它的“操作系统”。

你要避免的最大坑
坑 1：让 Claude 自己规划、自己执行、自己宣布成功

这不行。

因为它会自嗨。

所以必须引入 Codex 作为外部审查。

坑 2：Codex 说一堆建议，Claude 全部照做

也不行。

Codex 的建议要分级：

blocking_issues：必须修
non_blocking_suggestions：记录，不一定做
future_improvements：进入 backlog

Claude 只能执行 blocking issues。

坑 3：Agent 越跑越偏

解决方法是每轮都强制读取：

PROJECT_BLUEPRINT.md
PROJECT_STATE.md
CURRENT_TASK.md

并且每轮报告都要回答：

本轮是否偏离蓝图？
是否扩大了任务范围？
是否修改了禁止修改区域？
坑 4：二十四小时乱改到不可收拾

解决方法是设置安全停机条件：

连续两轮失败
测试无法通过
需要人类选择产品方向
要修改架构
要删除大量文件
要处理敏感配置
上下文不够确定

Agent 应该在这些情况下停下来，不是硬干。

真正强的 Agent 不是不停干，而是知道什么时候该停。

我建议你的最终启动方式

以后你在 Claude Code 里只需要说：

读取 PROJECT_BLUEPRINT.md 和 CLAUDE_ORCHESTRATOR_PROTOCOL.md。

你现在进入 Orchestrator 模式。

请根据项目蓝图启动长期开发循环：
1. 初始化 .agent 工作区
2. 生成 PROJECT_STATE.md
3. 生成 TASK_QUEUE.md
4. 每次执行一个任务
5. 每次完成后调用 Codex 审核
6. 根据 Codex 审核结果继续、返修或暂停
7. 阶段完成后提交 git
8. 遇到高风险问题写 HUMAN_HANDOFF.md 并停止

这才是你要的最终操作方式。

最终架构一句话

你的系统应该是：

Claude Code 不是普通执行者，而是主控运行环境；
Codex 不是控制者，而是外部审查器；
项目文件不是普通文档，而是 Agent 的长期记忆和轨道；
你不是传令兵，而是只在关键节点出现的老板。

所以最终方案应该从之前的：

你复制 Claude 报告给 Codex

进化为：

Claude Orchestrator 自动把报告交给 Codex
Claude Orchestrator 自动读取 Codex 审核
Claude Orchestrator 自动决定继续、返修或停机

一句话总结：

把“通信权”和“主控权”都放在 Claude Code 侧，让 Claude Code 成为长时间运行的调度器；Codex 只作为高质量审查工具被调用。