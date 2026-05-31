# Archive Inventory

归档时间：2026-05-31 B0 状态归一化

## 归档内容

### archive/.agent/

- SIMULATION_REPORT.md — Phase A 模拟验证报告（已被真实 sandbox 闭环替代）
- QUALITY_GATES_SUGGESTED.json — 工具链建议（已转化为实际 QUALITY_GATES.json）
- _simulation/ — 模拟验证的 .agent 运行态副本（历史证据，非当前状态）

### archive/.agents/

- skills/brainstorming/ — 与 .claude/skills/brainstorming 完全相同的副本，由 superpowers 插件安装过程产生，已去重

### archive/docs/

- superpowers/2026-05-29-24hagent-delivery-blueprint-design.md — 设计蓝图（已转化为实际产物）
- superpowers/2026-05-29-24hagent-implementation-plan.md — 实施计划（已被 Route B+ 计划替代）

## Brainstorming Skill 所有权

| 位置 | 角色 | 说明 |
|------|------|------|
| .claude/skills/brainstorming/ | Source of truth | 24Hagent 项目定制版，含 visual-companion 和 spec-document-reviewer |
| superpowers 插件 (brainstorming) | External dependency | 通用 brainstorming 能力，通过 Skill 工具调用 |
| 24hagent-starter/.claude/skills/brainstorming/ | Template copy | 分发模板，用于新项目初始化 |

规则：修改 brainstorming 行为时，先改 .claude/skills/brainstorming/，再同步到 24hagent-starter/。
