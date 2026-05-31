# PS1 Behavior Contract

## 必须保留的行为（TS engine 必须实现）

1. **Gate 执行顺序固定：** test → lint → typecheck → coverage。顺序不可变。

2. **Coverage 百分比从 RawOutput 解析：** vitest JSON summary 的 `total.lines.pct` / `total.branches.pct` / `total.functions.pct` / `total.statements.pct` 四个字段，不是从覆盖率表格文本提取。

3. **Coverage parse failure + blocking = FAIL：** 当 coverage gate enabled 且 blocking 时，无法解析覆盖率输出必须导致 overall FAIL，不能静默跳过。

4. **每个 gate 独立执行：** 前一个 gate 失败不能阻止后续 gate 执行。所有 gate 结果必须全部收集后才判定 overall verdict。

5. **File scope 检查：** `git diff --name-only` 对比 CURRENT_TASK.md 的 file_scope。任何越界文件 = BLOCKING failure。

6. **Verdict 三分支：** READY / NEEDS_CONFIG / BLOCKED（readiness）；PASS / FAIL（validation）。

7. **RawOutput 必须保留在报告中：** 每个 gate 的原始输出必须截断写入报告，用于人工审计和 Codex 审查的证据消费。

## 明确不迁的历史包袱

1. **PS 5.1 StrictMode 绕行：** `Test-Property` 守卫、`$LASTEXITCODE` 传播 trick、`-Command "& { ... }"` 包装。这些是 PowerShell 运行时的补救措施，TS 不需要。

2. **UTF-8 BOM 处理：** `fix-encoding.ps1` 和 PS 5.1 的 BOM 依赖。TS/Node 原生支持 UTF-8，不需要显式 BOM 管理。

3. **DryRun 模式：** `-DryRun` 开关和对应的模板输出。TS 用 fixture 测试替代，不需要模拟执行模式。

4. **grep / tail / python 一行流：** codex_review.ps1 中用来解析 JSONL 的 shell pipeline。B1 已有纯 TS 解析器。

5. **cmd wrapper：** `check_quality_readiness.cmd` 的 `-Command "& { ...; exit $LASTEXITCODE }"` 包装。TS CLI 原生 exit code 不需要中转。

6. **4000 char 截断常量：** PS1 中硬编码的 coverage 输出截断长度。TS 用可配置常量替代。
