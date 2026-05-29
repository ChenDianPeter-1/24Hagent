# 如何用在新项目 —— 一页纸指南

把 24Hagent 用到你自己的项目，只需 4 步。

## 1. 复制脚本

```powershell
# 从 24Hagent 仓库复制核心脚本到你的项目
cp scripts/check_quality_readiness.ps1 <你的项目>/
cp scripts/validate_task.ps1 <你的项目>/
cp scripts/codex_review.ps1 <你的项目>/
```

## 2. 填蓝图

```markdown
# .agent/PROJECT_BLUEPRINT.md

## Project Goal
你的项目一句话描述。

## MVP Scope
### In Scope
- 功能 A
- 功能 B

### Out of Scope
- 明确不做的东西

## Technical Boundaries
- 语言/框架/平台约束
- 测试框架 + coverage 工具

## Prohibited Actions
- （保留模板的禁止项列表）
```

## 3. 配质量门 + 跑就绪检查

```powershell
# 编辑 .agent/QUALITY_GATES.json，填入你项目的真实命令
# 然后跑就绪检查

powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
```

看到 `Verdict: **BLOCKED**` 说明工具链没配好——去装 test runner、linter、typechecker、coverage tool。
看到 `Verdict: **READY**` 就可以下一步了。

## 4. 启动

从 `START_ORCHESTRATOR.md` 复制"完整启动"提示词到 Claude Code。

Orchestrator 会自动：
1. 读蓝图 → 拆任务 → 写 CURRENT_TASK.md
2. Worker TDD 实现 → 写 WORK_REPORT.md
3. Orchestrator 独立复跑质量门 → 写 VALIDATION_REPORT.md
4. Codex 交叉审查 → 写 CODEX_REVIEW.md
5. PASS 继续 / NEED_FIX 返修 / NEED_HUMAN 停机

## 前置条件清单

- [ ] 项目有 `package.json` + 真实的 test/lint/typecheck/coverage 脚本
- [ ] 已安装 `codex-cli`（`codex --version` → 0.134+）
- [ ] `~/.codex/config.toml` 已配置 `[mcp_servers.codegraph]`（可选但推荐）
- [ ] `.agent/` 目录已创建，含 `QUALITY_GATES.json` 和 `PROJECT_BLUEPRINT.md`
- [ ] `check_quality_readiness.ps1` 返回 `READY`
- [ ] 项目是 git 仓库（codex_review.ps1 依赖 `git diff`）

## 三条铁律（搬到新项目也必须遵守）

1. 测试归 Claude Code，Codex 永不跑测试
2. Codex 全程只读（`--sandbox read-only`）
3. 要跑哪些测试在 `CURRENT_TASK.md` 的 `acceptance_checks` 字段提前说死

## 默认质量门

| Gate | 命令 | 阈值 |
|------|------|------|
| test | `npm test` | exit 0 |
| lint | `npx eslint src/` | exit 0 |
| typecheck | `npm run typecheck` | exit 0 |
| coverage | `npm run coverage` | lines 100%, branches 100%, functions 100%, statements 100% |

如果你的项目用不同工具，改 `.agent/QUALITY_GATES.json` 即可。
如果不需要某个门，把它的 `enabled` 设为 `false`。
