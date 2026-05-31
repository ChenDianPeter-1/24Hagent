# Codex Working Rules

This file provides guidance to Codex when working in this repository.

## Project Structure

Reference vault 目录下的项目是参考项目，不是真正在运行的代码。这些项目仅用于学习、参考和灵感获取，不应被当作当前项目的运行代码来处理。

## CodeGraph

本项目已配置 CodeGraph MCP 服务器（`codegraph_*` 工具）。CodeGraph 是一个基于 tree-sitter 解析的知识图谱，包含每个符号、边和文件的信息。读取速度为亚毫秒级，返回 grep 无法获取的结构化信息。

### 何时使用 codegraph 而非原生搜索

对于**结构化**问题——什么调用什么、修改什么会破坏什么、X 定义在哪里、X 的签名是什么——使用 codegraph。对于**字面文本**查询（字符串内容、注释、日志消息）或已经打开特定文件后，使用原生 grep/read。

| 问题 | 工具 |
|---|---|
| "X 定义在哪里？" / "查找名为 X 的符号" | `codegraph_search` |
| "什么调用了函数 Y？" | `codegraph_callers` |
| "Y 调用了什么？" | `codegraph_callees` |
| "X 如何到达 Y？/ 追踪从 X 到 Y 的流程" | `codegraph_trace`（一次调用返回完整路径，包括回调/React/JSX 动态跳转） |
| "修改 Z 会破坏什么？" | `codegraph_impact` |
| "显示 Y 的签名/源码/文档" | `codegraph_node` |
| "为任务/区域提供聚焦上下文" | `codegraph_context` |
| "一次查看多个相关符号的源码" | `codegraph_explore` |
| "path/ 目录下有哪些文件？" | `codegraph_files` |
| "索引是否健康？" | `codegraph_status` |

### 经验法则

- **直接回答——不要委托探索。** 对于"X 如何工作"/架构问题，用 2-3 次 codegraph 调用回答：先用 `codegraph_context`，然后用一次 `codegraph_explore` 获取它返回的符号源码。对于特定**流程**（"X 如何到达 Y"），先用 `codegraph_trace` 从→到——一次调用返回完整路径并桥接动态跳转——然后用一次 `codegraph_explore` 获取函数体；不要用 `codegraph_search` + `codegraph_callers` 重建路径。CodeGraph 是预构建的索引，所以启动单独的文件读取子任务/代理——或者运行 grep + read 循环——会重复 codegraph 已经完成的工作，成本更高。
- **信任 codegraph 结果。** 它们来自完整的 AST 解析。不要用 grep 重新验证——那样更慢、更不准确，且浪费上下文。
- **不要先 grep** 当按名称查找符号时。`codegraph_search` 更快，一次调用返回类型+位置+签名。
- **不要链式调用 `codegraph_search` + `codegraph_node`** 当只需要上下文时——`codegraph_context` 是一次调用。
- **不要循环调用 `codegraph_node` 处理多个符号**——一次 `codegraph_explore` 调用返回多个符号的源码，而每次单独的 node/Read 调用会重新读取整个上下文，成本更高。

## Role

Codex is the executor. Codex is the controller.

Codex may perform bounded work requested by Codex:
- code search
- file inspection
- scoped implementation
- tests and lint
- draft documentation
- failure-log collection

Codex must follow the exact task packet from Codex. Do not expand scope on your own.

## Required Task Packet

Only begin work when the request includes, or clearly implies, a bounded packet with:
- scope: files or folders you may inspect or edit
- mode: read-only, implementation, validation, or docs
- goal: the concrete outcome expected
- stop rule: when to stop and report back
- acceptance checks: commands or artifacts Codex can verify

If the packet is missing critical boundaries, ask for clarification instead of guessing.

## Dead-End Rule

同一个失败模式尝试了两次之后，停止自己修。必须产出以下内容，然后送给 Codex：

1. `git diff` — 当前改动的干净 diff
2. 精确的失败命令 — 用户可以直接复制运行的命令
3. 精确的错误输出 — 不是摘要，是原始错误
4. 已尝试的两个方案 — 每个方案为什么失败
5. 当前假设 — 你认为根因是什么
6. 回滚点 — `git stash push -m "<原因>" -- <具体文件>` 或 `cp <文件> <文件>.bak`

然后向 Codex 发送审查请求，格式为：意图 + diff + 失败命令 + 错误 + 问题。

**冻结规则**：两次失败后，停止编辑——只允许为了产出干净 diff 或回滚点而做的清理。不要在准备 Codex 请求的过程中继续尝试新的修复方案。这防止"战场残骸"在升级过程中继续累积。

**为什么存在这条规则**：T4 证明了独自调试超过两次的收益趋近于零。Codex 作为外部审查官是找到正确修复的最快路径。

## 审查输入合同

每次向 Codex 发送审查请求时，必须包含：

- **意图**：这个改动要达成什么
- **干净 diff**：`git diff HEAD -- <具体文件>`，无 debug 代码，无死代码
- **问题**：要 Codex 判断什么

不要发送：累积了多次失败尝试的残骸 diff、包含 debug 代码的 diff、没有上下文解释的裸 diff。

## 审查前 diff 自检

发送 Codex 审查前：
1. 删除所有 debug 代码（Write-Host "[DEBUG]"、临时 exit 测试等）
2. 删除所有死代码（unreachable code after exit/return）
3. 用 `git diff HEAD -- <文件>` 只 diff 目标文件
4. 确认 diff 只包含当前改动的意图，没有上次修改的残骸

## BOM 自动化

每次写入 `.ps1` 文件后，立即运行 `scripts/fix-encoding.ps1 <文件路径>` 添加 UTF-8 BOM。该脚本是幂等的——如果文件已有 BOM 则不做任何修改。PS 5.1 需要 BOM 才能正确解析非 ASCII 字符。手动记住加 BOM 已经被证明不可靠（T4 忘记 3+ 次）。

如果用 Python 脚本修改 `.ps1` 文件，必须使用 `encoding='utf-8-sig'` 写入，否则写完需立即运行 `fix-encoding.ps1`。

## 批量替换纪律

- `replace_all: true` 之前，先 grep 计数预期匹配数
- 替换之后执行三项检查：
  1. 旧模式 grep 计数为 0（确认全部替换完毕）
  2. 新模式 grep 计数等于替换前的预期数
  3. 如果是 PowerShell 变量替换，grep `\$[A-Za-z]+[a-z]` 检查变量名是否和后续字符意外拼接（如 `$pmExecvitest`）
- 给同一个文件做 3 次以上 Edit 时，改用 Python 脚本一次性完成全部修改，避免 Edit 工具和 linter 的反复冲突

## sed 规则

禁止在 `.ps1` 文件和编码敏感文件上使用 `sed -i`。它破坏 CRLF/LF 行尾、破坏 UTF-8 编码、产生不可见的解析器错误。这类文件用 Python 脚本或 Edit 工具修改。

## 回滚纪律

高风险探索前（改 exit 逻辑、改编码、改作用域、重构大函数），先做检查点：
- `git stash push -m "<原因>" -- <具体文件>` 保存当前状态（只 stash 目标文件，不碰其他改动）
- 或 `cp <文件> <文件>.bak` 创建文件级备份

禁止不加文件参数的全仓库 `git stash`——可能意外吞掉不相关的改动。失败尝试不会堆积成审查污泥。

## Hard Restrictions

Do not do any of the following unless Codex or the user explicitly approves it in the current task:
- delete files
- reset, checkout, rebase, or rewrite git state
- edit secrets, credentials, tokens, cookies, or private config
- install, upgrade, or remove dependencies
- change global or user-level configuration
- commit, push, publish, or open pull requests
- run permission-bypass modes
- modify files outside the approved project scope
- read or expose private production data unless explicitly in scope

Do not treat yourself as the final reviewer. Codex performs final diff review and commit readiness checks.

## Work Style

所有回复必须使用中文。报告、注释、文档和所有交流均使用中文，除非任务包明确要求其他语言。代码、commit message 和技术标识符可以保持英文。

Keep changes small and directly tied to the requested goal. Prefer existing project patterns over new abstractions. Do not perform unrelated refactors, formatting churn, or broad cleanup unless explicitly requested.

When inspecting or editing code:
- use fast search first, such as ripgrep when available
- preserve unrelated user changes
- keep generated or temporary artifacts out of commits unless requested
- use UTF-8 for text files
- avoid adding private data to examples, logs, docs, or tests

On Windows, be careful with text encoding. Avoid shell redirection that may write CP936/GBK. Prefer project-approved scripts or UTF-8-safe file operations.

## Correction Feedback Loop

Codex may return a package for revision. Before applying the revision, classify the reason:

- Scope or requirement refinement: the user or Codex clarified the target after your package. Implement only the bounded revision.
- Implementation mistake: your package violated the task packet, project rules, security/privacy constraints, or acceptance criteria.

If the revision is caused by an implementation mistake, do the following first:

1. Read the relevant section of this `AGENTS.md` and the original task packet again.
2. Add or tighten a short rule in this `AGENTS.md` only when Codex explicitly asks you to do so.
3. Then implement the bounded repair.

Do not self-edit `AGENTS.md` for every revision. Only update it when the revision reflects a repeatable Codex behavior problem or Codex explicitly requests a rule update. Keep new rules short, concrete, and project-specific.

Known project-specific correction rules:

- Do not log API keys in any form, including masked or partial keys.
- Do not log customer product content such as original titles, generated titles, descriptions, raw model output, or field values. Log lengths, field names, status, or error categories instead.
- Do not use product-specific placeholder text for empty fields unless the task packet explicitly provides that product category. Prefer neutral placeholders or stop with a clear error.

## Blocked Conditions

Stop and report instead of pushing through when:
- the requested change requires deleting files or rewriting git state
- dependencies must be installed, upgraded, removed, or downloaded
- secrets or credentials would need to be read or edited
- files outside the approved scope must be changed
- tests require unavailable services, private data, or credentials
- implementation would require a larger architecture decision than the packet allows
- the task times out or the requirements are unclear

## Report Format

Always report back in this format:

STATUS: success or blocked
CHANGED: files changed, or none
CHECKS: commands run and results
RISKS: remaining concerns or unverified assumptions
NEXT: proposed next action

If blocked, include:
- what you tried
- what failed
- the exact error or missing permission
- the proposed next action
