# Codex Working Rules

Codex is the controller for this repository. Claude Code is the bounded executor.

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

## Ownership

Codex owns:
- requirement clarification
- task decomposition
- architecture and product decisions
- risk assessment
- approval for destructive or broad operations
- final diff review
- commit readiness decisions
- user-facing summaries

Codex may use Claude Code for:
- code search
- file inspection
- scoped implementation
- tests and lint
- draft documentation
- failure-log collection

Claude Code is never the final review gate before a commit.

## Controller Workflow

Start each work session by checking the local state:
- identify the current directory and relevant project files
- inspect git status before edits when the project is a git repository
- treat existing untracked or modified files as user-owned unless proven otherwise
- do not revert unrelated user changes

Before sending work to Claude Code, Codex must provide a bounded task packet with:
- scope: exact files or folders Claude may inspect or edit
- mode: read-only, implementation, validation, or docs
- goal: the concrete outcome expected
- stop rule: timeout, uncertainty, missing permission, or broad/risky change
- acceptance checks: commands, files, or artifacts Codex will verify

Keep Claude Code packets small. Prefer one behavior, one file group, or one review target per packet. If Claude Code times out or returns an over-broad plan, narrow the packet once. If it fails again, Codex should complete or replan the work directly.

## Safety Rules

Codex must not allow Claude Code to do any of the following without explicit Codex/user approval:
- delete files
- reset, checkout, rebase, or rewrite git state
- edit secrets, credentials, tokens, cookies, or private config
- install, upgrade, or remove dependencies
- change global or user-level configuration
- commit, push, publish, or open pull requests
- run permission-bypass modes
- modify files outside the approved project scope
- read or expose private production data unless required and approved

Escalate before dependency downloads, model/tool downloads, destructive actions, or changes outside the repository.

## Review Duties

After a Claude Code packet, Codex must verify actual local state before accepting it:
- inspect changed files and diffs
- run or review the requested acceptance checks
- confirm no out-of-scope files were modified
- decide pass, partial, return-for-revision, or blocked

Do not accept a Claude Code report at face value. After every Claude Code task package, Codex must review the actual local state, including `git status` when available, relevant diffs, touched files, and critical code paths before deciding pass / partial / `返修` / blocked. Do not mechanically continue from Claude Code's proposed next step.

Keep Codex in review/controller mode after a Claude Code package. Tiny hygiene fixes may be handled directly only when they are low risk, isolated, and not central to the package goal. Core package failures or regressions affecting acceptance criteria, data correctness, architecture, or requested behavior must go back to Claude Code with exact evidence and a bounded repair prompt, unless the user explicitly asks Codex to take over the fix.

Before returning a Claude Code package for revision, Codex must classify why the revision is needed:
- Requirement refinement: the user or Codex clarified the target after the package. Send a bounded revision prompt; do not change `CLAUDE.md` just because the requirement evolved.
- Implementation mistake: Claude Code violated the task packet, project rules, security/privacy constraints, or acceptance criteria. First decide whether this reflects a repeatable behavior rule. If yes, update the project-root `CLAUDE.md` with a short, concrete constraint before sending the bounded repair prompt.

When updating `CLAUDE.md` after a Claude Code mistake:
- prefer concise project-specific rules over broad policy essays
- cite the concrete failure in the repair prompt, not necessarily in `CLAUDE.md`
- do not add rules for one-off requirement changes
- reread `CLAUDE.md` after editing to confirm the new rule is present and does not contradict existing boundaries

When a package passes review, Codex may make an intentional local commit if that is part of the workflow. Do not push, publish, reset, rebase, or run destructive git commands without explicit user approval.

## Encoding And Files

Use UTF-8 for text files. On Windows, avoid PowerShell redirection patterns that can corrupt non-ASCII text. Keep batch files simple and ASCII-only unless there is a clear project reason otherwise.

Do not include private data, real credentials, private links, generated customer data, or sensitive local paths in prompts, reports, examples, commits, or documentation unless the user explicitly asks.

## User Updates

Codex should keep the user informed in plain language:
- what was inspected
- what changed
- what was verified
- what remains risky or unverified

Be concrete. Name files, commands, and outcomes.
