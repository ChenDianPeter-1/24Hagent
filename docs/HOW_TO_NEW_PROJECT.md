# 如何用在新项目 —— 一页纸指南

把 24Hagent 用到你自己的项目，只需 3 步。

## 1. 复制 starter 到你的项目

```
你的项目/
  24hagent-starter/    ← 从 24Hagent 仓库复制这个目录过来
    Start.bat          ← 双击启动
    Start.ps1
    setup.ps1
    setup.sh
    bin/24hagent.mjs   ← 核心工具
    ...
```

## 2. 双击 Start.bat

starter 会自动：
- 检测项目技术栈（Node / Python / 空项目）
- 生成 `.agent/` 运行态目录
- 初始化 `QUALITY_GATES.json`、`PROJECT_BLUEPRINT.md` 模板
- 打开 Claude Code 进入接入向导（或输出提示词让你手动粘贴）

Claude Code 接入向导会：
- 只读项目，不改业务代码
- 问你项目目标、当前任务、技术栈、边界
- 生成 `.agent/PROJECT_BLUEPRINT.md`、`.agent/CURRENT_GOAL.md`
- 确认后才进入编排循环

## 3. 填蓝图 + 配质量门

接入向导帮你生成了模板，你需要确认/修改：

- `.agent/PROJECT_BLUEPRINT.md` — 项目目标、范围、禁止项
- `.agent/QUALITY_GATES.json` — 质量门命令（test/lint/typecheck/coverage）
- `.agent/CURRENT_GOAL.md` — 当前阶段目标

然后启动编排循环，Claude Code 会按协议自动运行。

## 前置条件

- [ ] Node.js 20+（starter 的 24hagent.mjs 需要 Node 运行）
- [ ] 项目是 git 仓库
- [ ] 已安装 Claude Code CLI（`claude` 命令）
- [ ] 如需异模型审查：已安装 `codex-cli`（`codex --version` → 0.134+）
- [ ] 如需结构化分析：`~/.codex/config.toml` 已配置 codegraph MCP（可选但推荐）

## 质量门默认配置

| Gate | 命令 | 阈值 |
|------|------|------|
| test | `npm test` | exit 0 |
| lint | `npx eslint src/` | exit 0 |
| typecheck | `npm run typecheck` | exit 0 |
| coverage | `npm run coverage` | lines 100%, branches 100%, functions 100%, statements 100% |

如果是 Python 项目，改为 `pytest`、`ruff`、`mypy`、`coverage.py`。
如果不需要某个门，把 `enabled` 设为 `false`。
如果要自定义阈值，改 `threshold` 字段。

## 三条铁律

1. 测试归 Claude Code，Codex 永不跑测试
2. Codex 全程只读（`--sandbox read-only`）
3. 要跑哪些测试在 `CURRENT_TASK.md` 的 `acceptance_checks` 字段提前说死

## 编排循环

```
选任务 → 写 CURRENT_TASK.md（含 acceptance_checks）
  → Worker TDD 实现 → 写 WORK_REPORT.md
  → Orchestrator 独立复跑质量门 → 写 VALIDATION_REPORT.md
  → Codex 审查（读 diff + codegraph 查结构）→ 写 CODEX_REVIEW.md
  → PASS 继续 / NEED_FIX 返修（最多 2 次）/ NEED_HUMAN 停机
  → git commit
```
