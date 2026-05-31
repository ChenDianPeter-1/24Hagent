# 24Hagent Handoff

更新时间：2026-05-31

## 项目状态总览

**Sandbox 验证已完成**：24Hagent 在 sandbox/string-utils 上跑通了 PASS 和 NEED_FIX 两条路径，Codex + codegraph 跨模型审查护城河已真实验证。

**根项目自举进行中**：当前处于 B0 状态归一化阶段。根项目 quality gates 尚未闭合（BLOCKED），正在按 Codex 审查后的 Route B+ 路线执行自进化。

## 已完成

### Phase A：自举修复

- A1：git init + 基线 commit ✓
- B2-smoke（风险前置）：Codex 首次真实调用 → 3 个真实 bug 修复 ✓
- A2：E2E 报告路径 bug 修复 ✓
- A3：PowerShell 5.1 编码乱码修复（UTF-8 无 BOM）✓
- A4：PROJECT_BLUEPRINT.md 填充真实内容 ✓
- A5：3 条铁律写入协议 + codegraph 审查条目 ✓

### Phase B：真实闭环验证（交付达成）

- B1：sandbox/string-utils/ 项目建好（TS + vitest + eslint + 100% coverage）✓
- B2：Codex 真实调用冒烟（stdin 管道 + stderr 侧车 + StrictMode 安全解析器）✓
- B3：PASS 路径跑通（slugify 实现 → 质量门 → Codex PASS → commit）✓
- B4：NEED_FIX 路径跑通（underscore 测试遗漏 → Codex NEED_FIX → 返修 → PASS）✓
- B5：codegraph 结构分析生效（11 次 MCP 工具调用，codegraph_context/explore/search）✓

### Phase C：固化（未开始）

- 待根项目自举完成后再启动

## 三条角色边界铁律（已验证生效）

1. 测试归 Claude Code：Worker 按 TDD 写+跑，Orchestrator 独立复跑，Codex 只消费 VALIDATION_REPORT 作证据
2. Codex 全程只读：`codex exec --sandbox read-only`，B3/B4/B5 共 7 次真实调用，0 次执行测试/构建/写文件
3. acceptance_checks 提前说死：CURRENT_TASK.md 必填字段，B3/B4/B5 所有任务均遵循

## 核心脚本

| 脚本 | 状态 |
|------|------|
| scripts/validate_task.ps1 | ✓ 可用（coverage JSON 优先解析、UTF-8 无 BOM、4000 char 截断） |
| scripts/codex_review.ps1 | ✓ 可用（stdin 管道、stderr 侧车、StrictMode 安全解析器、evidence-first prompt） |
| scripts/check_quality_readiness.ps1 | ✓ 可用（就绪检查 + 建议生成） |

## 仓库结构

```
24Hagent/
├── scripts/*.ps1          三个质量门 + Codex 审查脚本
├── CLAUDE_ORCHESTRATOR_PROTOCOL.md  编排器操作系统（含 3 条铁律）
├── START_ORCHESTRATOR.md  启动入口（含前置检查）
├── .agent/                运行态（gitignored）
└── sandbox/string-utils/  独立 TS git 仓库（Phase B 验证对象，gitignored）
    ├── src/slugify.ts      slugify + truncateSlug 实现
    ├── src/slugify.test.ts  13 tests, 100% coverage
    └── .codegraph/        codegraph 索引
```

## 新窗口启动

1. 读 CLAUDE.md → CLAUDE_ORCHESTRATOR_PROTOCOL.md → docs/HANDOFF.md
2. 检查 `check_quality_readiness.ps1`（BLOCKED = 禁止启动循环）
3. 选择 START_ORCHESTRATOR.md 中合适的启动模式
