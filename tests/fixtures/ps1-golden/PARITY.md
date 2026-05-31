# PS1 → TS Parity Matrix

## check_quality_readiness.ps1 → ReadinessEngine

| PS1 行为 | TS 函数 | 状态 | 原因 |
|---------|---------|------|------|
| Detect-NodeToolchain | detectToolchain() | preserve | 核心逻辑 |
| Detect-PythonToolchain | — | drop | 根项目只需 Node |
| Test-IsPlaceholderTestScript | identifyPlaceholders() | preserve | 核心逻辑 |
| Compare-Gates | — | intentionally change | 合并进 classifyReadiness |
| Resolve-ReadinessVerdict | classifyReadiness() | preserve | 核心逻辑 |
| Write-ReadinessReportFile | renderReadinessReport() | preserve | I/O 分离到 CLI |
| Write-SuggestedGatesFile | — | drop | 建议 JSON 不再自动生成 |
| Read-JsonSafe（BOM 兼容） | — | drop | PS5.1 only |
| Invoke-VerifyGates | computeReadinessExitCode() | preserve | exit code 语义 |
| -Verify 模式 | — | drop | TS 用 fixture 测试替代 |

## validate_task.ps1 → ValidationEngine

| PS1 行为 | TS 函数 | 状态 | 原因 |
|---------|---------|------|------|
| Read-JsonFile（QUALITY_GATES） | loadGateConfig() | preserve | 核心逻辑 |
| gateOrder = test/lint/typecheck/coverage | planGateExecutions() | preserve | 顺序不可变 |
| Invoke-GateCommand | CommandRunner.run() | preserve | 接口隔离 |
| 覆盖率 JSON 解析 | parseCoverageFromRawOutput() | preserve | vitest JSON summary |
| 阈值对比 | evaluateThresholds() | preserve | 100%=PASS, 99%=FAIL |
| coverage parse failure → FAIL | — | preserve | 硬要求 |
| 独立 gate 执行（不短路） | runConfiguredGates() | preserve | 全部收集再判定 |
| git diff file scope 检查 | — | preserve | CLI 层实现 |
| Truncate-Text（4000 char） | — | intentionally change | 用可配置常量 |
| DryRun 模式 | — | drop | fixture 测试替代 |
| ReadinessCheck 模式 | — | drop | B3-1 独立处理 |
| GenerateE2EReport | — | drop | 合并进 renderValidationReport |
| StrictMode JSON 属性守卫 | — | drop | PS5.1 only |

## codex_review.ps1 → ReviewEngine

| PS1 行为 | TS 函数 | 状态 | 原因 |
|---------|---------|------|------|
| 组装 review prompt | collectReviewInputs() + buildReviewPrompt() | preserve | 核心逻辑 |
| codex exec --sandbox read-only | — | intentionally change | CLI 层调 codex，不进 engine |
| stdin 管道传 prompt | — | drop | shell 细节 |
| stderr sidecar 分离 | — | drop | shell 细节 |
| JSONL 解析（只取 agent_message） | parseReviewResult() | preserve | 复用 B1 |
| YAML verdict 提取 | parseReviewResult() | preserve | 复用 B1 |
| Write-CodexReview（CODEX_REVIEW.md） | renderReviewMarkdown() | preserve | 核心逻辑 |
| Get-GitDiff | — | intentionally change | CLI 层实现 |
| Read-SectionValue | — | drop | B1 task-package parser 已替代 |
| Truncate-Text（prompt 大小） | — | drop | TS 不需要截断 |
| grep/tail/python 一行流 | — | drop | 严禁进 TS |
