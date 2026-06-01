# 24Hagent Handoff

更新时间：2026-06-01

## 项目状态总览

**Sandbox 验证已完成**：24Hagent 在 sandbox/string-utils 上跑通了 PASS 和 NEED_FIX 两条路径，Codex + codegraph 跨模型审查护城河已真实验证。

**根项目自举持续迭代**：B3 闭环已打通，TypeScript CLI 全部接管 PS1 脚本。审查质量已升级（证据包补全、任务质量门、模块边界护栏）。

## 已完成

### Phase A：自举修复

- A1：git init + 基线 commit ✓
- B2-smoke（风险前置）：Codex 首次真实调用 → 3 个真实 bug 修复 ✓
- A2：E2E 报告路径 bug 修复 ✓
- A3：PowerShell 5.1 编码乱码修复（UTF-8 无 BOM）✓
- A4：PROJECT_BLUEPRINT.md 填充真实内容 ✓
- A5：3 条铁律写入协议 + codegraph 审查条目 ✓

### Phase B：真实闭环验证

- B1：sandbox/string-utils/ 项目建好 ✓
- B2：Codex 真实调用冒烟 ✓
- B3：PASS 路径跑通 + NEED_FIX 路径跑通 + codegraph 结构分析生效 ✓

### Phase B3：TypeScript CLI 完整交付

- B3-0~B3-5：ReadinessEngine + ValidationEngine + ReviewEngine + CLI 入口 ✓
- PS1 核心脚本全部由 TS CLI 接管 ✓
- 极致清洁（30+ 残留文件删除）✓
- esbuild 打包 CLI 为单文件 ✓
- npm 全局安装支持 ✓

### Starter 升级

- Superpower 能力包分发 ✓
- Start.bat / Start.ps1 一键入口 ✓
- 接入向导 prompt 重新设计 ✓

### 审查质量提升

- 送审证据包补全（evidence-builder + scoped diff + 越界保护）✓
- 任务质量门上线（task-quality-gate + `24h task:review`）✓
- 模块边界护栏接入（eslint-plugin-boundaries + 6 层边界规则）✓

## 三条角色边界铁律（已验证生效）

1. 测试归 Claude Code：Worker 按 TDD 写+跑，Orchestrator 独立复跑，Codex 只消费 VALIDATION_REPORT 作证据
2. Codex 全程只读：`codex exec --sandbox read-only`
3. acceptance_checks 提前说死：CURRENT_TASK.md 必填字段

## 核心模块

| 模块 | 位置 | 职责 |
|------|------|------|
| CLI 入口 | `src/cli/` | main / readiness / validate / review / task-review / status |
| 质量引擎 | `src/core/quality/` | ReadinessEngine + ValidationEngine + TaskQualityGate |
| 审查引擎 | `src/core/review/` | evidence-builder + prompt-builder + result-renderer |
| Schema | `src/core/schemas/` | task-package / review-result / run-state / evidence-packet |
| 适配器 | `src/adapters/shell/` | CommandRunner 接口 + RealCommandRunner |
| 边界配置 | `eslint.config.mjs` | eslint-plugin-boundaries 6 层规则 |

## 关键命令

| 命令 | 用途 |
|------|------|
| `24h readiness` | 就绪检查 |
| `24h validate` | 本地质量门 |
| `24h validate:plan` | 预览质量门执行计划 |
| `24h review:prompt` | 生成 Codex 审查 prompt |
| `24h review:render` | 渲染审查报告 |
| `24h task:review` | 执行前任务包质量门 |

## 新窗口启动

1. 读 CLAUDE.md → CLAUDE_ORCHESTRATOR_PROTOCOL.md → docs/HANDOFF.md
2. 检查 `24h readiness` 或 `npm test`
3. 选择 START_ORCHESTRATOR.md 中合适的启动模式
