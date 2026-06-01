# Changelog

## 2026-06-01 — 审查质量提升

**送审证据包补全**
- 新增 `evidence-builder.ts`：统一收集送审材料（任务包、工作报告、验证报告、审查标准）
- 送审 diff 限制在当前任务 file_scope 内，超出范围的文件变更会被阻断
- diff 行数和变更文件数保护，过大时自动中止送审
- `prompt-builder.ts` 保持纯函数，只负责 Markdown 排版
- `review.ts` 瘦身为 CLI glue，不再承担证据组装逻辑

**任务质量门**
- 新增 `task-quality-gate.ts`：Worker 执行前审查 CURRENT_TASK.md 质量
- 8 种判定码：任务过大、范围过宽、DoD 过少/过虚、验收命令缺失、Stop Rule 过虚、高风险配置变更
- 三分支判定：PASS / NEED_FIX / NEED_HUMAN
- 新命令 `24h task:review`

**模块边界护栏**
- 接入 `eslint-plugin-boundaries`，6 层边界规则（cli/adapter/schema/quality/review/test）
- 违反边界时 `npm run lint` 失败
- 新增 `docs/ARCHITECTURE_BOUNDARIES.md` 说明各层依赖规则

**Starter 接入升级**
- Superpower 能力包从仓库迁移到 starter 分发
- 新增 Start.bat / Start.ps1 一键启动入口
- 24Hagent 安装接入 prompt 重新设计

## 2026-05-31 — Python 适配与清洁

**Python 项目支持**
- readiness 支持 `pyproject.toml` 检测
- Python 工具链检测（python/pytest）
- coverage.py 输出解析
- 空项目自动创建 `pyproject.toml`

**B3 CLI 完整交付**
- B3-0：Golden fixture + 行为契约（17 fixture，7 条保留行为）
- B3-0.5：Parity Matrix（35 条 PS1 行为 → TS 映射）
- B3-1：ReadinessEngine（工具链检测 + 就绪判定 + 报告渲染，19 测试）
- B3-2a：类型定义 + CommandRunner 接口 + FakeCommandRunner
- B3-2b：Coverage 解析 + 阈值判定（11 测试）
- B3-2c：Gate 编排（loadGateConfig + planGateExecutions + runConfiguredGates，13 测试）
- B3-2d：ValidationReport 渲染（6 测试，ValidationEngine 闭环）
- B3-3a：prompt-builder（buildReviewPrompt，4 测试）
- B3-3b：result-renderer（renderReviewMarkdown，5 测试）
- B3-4a/b：构建基础设施 + RealCommandRunner（tsconfig.build.json + ESLint 配置）
- B3-4c：CLI 接管（classifyExecError 纯函数 + 4 个 CLI 文件）
- B3-4d：CLI smoke test（3 测试覆盖 readiness/validate:plan/review:render）
- B3-5：删除 PS1 核心脚本（5 文件删除，37 处引用替换为 TS CLI）

**极致清洁**
- 删除 30+ 残留文件（历史草稿、PS1 golden、过期 setup、重复配置）
- 核心文件从 60+ 精简到 29

**分发与构建**
- esbuild 打包 CLI 为单文件（430KB，零依赖）
- npm 全局安装支持（bin 字段 + prepare 脚本）
- Starter 完善（setup.ps1/sh + README + QUALITY_GATES 模板）

**B2 闭环自证**
- status 命令（20 行核心 + 66 行测试，30 测试 100% 覆盖率）

**B1 TypeScript 地基**
- 4 个 Zod schema + 纯函数解析器（25 测试，100% 覆盖率）

**B0 状态归一化**
- 文档与运行态对齐事实基线
- 历史残留归档

## 2026-05-30 — Starter 质量迭代

**T1**：readiness 尊重 enabled:false + 包管理器 + 命令对齐
**T2**：空项目初始化（coverage-v8 + eslint.config.mjs + venv）
**T3**：复制冲突检测 + 复制后完整性校验 + 预检
**T4**：-Verify 模式 + .cmd 包装器（exit code 正确传递）
**T5**：setup 诚实的问题计数
**T6**：7 条工作纪律规则（来自 T1-T5 回顾）

**Starter 首次交付**
- setup.ps1：一键安装器
- README.md 面向首次访客
- 公开发行前清洁

**Phase C 文档**
- 就绪门文档
- 交接文档更新
- 新项目向导

## 2026-05-29 — 规划与地基

**Phase A：规划**
- 24Hagent 交付蓝图
- 实施方案（Phase A + Phase B）
- PROJECT_BLUEPRINT.md 填写
- 3 条铁律 + codegraph 审查标准

**Phase B 验证**
- sandbox/ 隔离验证环境
- codex_review.ps1（stdin piping + stderr sidecar + JSONL 解析器）
- coverage JSON 解析器
- Codex prompt 证据优先指令
- 初始基线提交
