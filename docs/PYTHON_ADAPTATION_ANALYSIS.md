# 24hagent 应用于 Python 项目 —— 全量问题扫描与解决方案

分析日期：2026-05-31
审查状态：Codex NEED_FIX → 已修正（3项阻塞问题全部修复）
前提：24hagent 本身保持 TypeScript/Node.js，作为工具去检查和验证 Python 目标项目。

---

## 一、架构分层：哪些需要改，哪些不需要改

24hagent 分为两层：

**工具层（24hagent 自身）**：TypeScript CLI、Node.js 运行时、Zod schema、Markdown 解析、状态机协议
**检测层（对目标项目的感知）**：项目文件读取、工具链识别、覆盖率解析、质量门命令建议

结论：工具层大部分不需要改，检测层需要扩展以支持 Python 项目。

---

## 二、问题全量清单（按阻塞级别分类）

### A. 硬阻塞 —— 不改则无法用于 Python 项目（3项）

#### A1. readiness.ts 只认 package.json
- 位置：[src/cli/readiness.ts:6-11](src/cli/readiness.ts#L6-L11)
- 当前代码：`resolve(root, 'package.json')`，不存在直接 exit(1)，报错 "package.json not found"
- Python 项目：使用 pyproject.toml / setup.cfg / setup.py
- 影响：对任何 Python 项目运行 `24h readiness` 直接报错退出

#### A2. detectToolchain() 只读 package.json 格式 + 只识别 JS 工具
- 位置：[src/core/quality/readiness-engine.ts:38-74](src/core/quality/readiness-engine.ts#L38-L74)
- 当前代码细节：
  - 第39行：参数类型是 `{ devDependencies?, dependencies?, scripts? }` —— package.json 专有字段
  - 第48行：`hasDep('vitest') ? 'vitest' : hasDep('jest') ? 'jest' : hasDep('mocha') ? 'mocha' : null` —— 只查 JS 测试框架
  - 第52-53行：`hasDep('eslint')` —— 只查 eslint
  - 第57-58行：`hasDep('typescript')` —— 只查 tsc
  - 第62行：`testRunner ? 'vitest built-in' : null` —— 覆盖率工具硬编码
  - 第68-71行：命令全部是 `npm run test/lint/typecheck/coverage`
  - 第72行：`packageManager: 'npm', projectTypes: ['node']` —— 硬编码
- Python 对应工具：pytest、ruff/mypy、coverage.py、pip/uv/poetry
- 影响：无法识别任何 Python 工具链

#### A3. parseCoverageFromRawOutput() 只解析 vitest JSON，且 CoveraData 模型强制四项指标
- 位置：[src/core/quality/validation-engine.ts:6-28](src/core/quality/validation-engine.ts#L6-L28) + [src/core/quality/validation-types.ts:29-34](src/core/quality/validation-types.ts#L29-L34)
- 当前代码：搜索 `{"total":` 模式，读取 `total.lines.pct` 等字段
- 更深层问题：CoverageData 接口强制 lines/branches/functions/statements 四项，但 Python coverage.py 不提供函数覆盖率
- Python coverage.py 输出格式：`{"totals": {"percent_covered": 90.0, "num_statements":..., "covered_lines":..., "num_branches":..., "covered_branches":...}}`
- 影响：coverage 质量门对 Python 项目永远 PARSE_FAILED；即使解析成功，functions 指标的语义是错的

---

### B. 半阻塞 —— 影响体验和正确性（6项）

#### B1. readiness 报告的修复建议全是 npm 命令
- 位置：[src/core/quality/readiness-engine.ts:156-160](src/core/quality/readiness-engine.ts#L156-L160)
- 当前建议：`npm install --save-dev vitest (or jest)`, `npm install --save-dev eslint`, "Add test/lint scripts to package.json"
- 影响：对 Python 用户给出无效建议

#### B2. 默认 QUALITY_GATES.json 命令和文档示例全是 npm 系
- 位置：文档模板中的默认值 + [src/core/quality/validation-engine.ts:210-211](src/core/quality/validation-engine.ts#L210-L211)（引用 .ps1 脚本）
- 注意：validate 命令本身不关心命令内容——它只读取 QUALITY_GATES.json 中的 command 字符串并执行（见 [src/cli/validate.ts:7-10](src/cli/validate.ts#L7-L10) 和 [src/core/quality/validation-engine.ts:83-99](src/core/quality/validation-engine.ts#L83-L99)）。真正阻塞的是默认配置值和 readiness 的建议生成，而非 validate 执行引擎。
- 当前默认：`npm test`, `npx eslint src/`, `npm run typecheck`, `npm run coverage`
- 影响：Python 用户必须全手动改写 QUALITY_GATES.json，无自动引导

#### B3. identifyPlaceholder() 检测 npm 默认模板
- 位置：[src/core/quality/readiness-engine.ts:30-36](src/core/quality/readiness-engine.ts#L30-L36)
- 当前逻辑：`"Error: no test specified"` 是 npm init 默认 test 脚本
- 影响：Python 项目的测试命令不会被误判（KNOWN_CMDS 已含 python|pytest），但逻辑不对称

#### B4. KNOWN_CMDS 虽然包含 python/pytest 但不用于检测
- 位置：[src/core/quality/readiness-engine.ts:28](src/core/quality/readiness-engine.ts#L28)
- 第28行 `KNOWN_CMDS` 正则包含了 `python|pytest`，但这只用于 identifyPlaceholder 判断
- detectToolchain 的 hasDep 逻辑完全不查 Python 依赖
- 影响：KNOWN_CMDS 有一半的 Python 关键词，但实际检测逻辑没用上，不一致

#### B5. 协议层包含 JS/TS 特定的 lint/type 抑制规则
- 位置：[CLAUDE_ORCHESTRATOR_PROTOCOL.md:139](CLAUDE_ORCHESTRATOR_PROTOCOL.md#L139)
- 当前规则：`NOT suppress linter/type errors with eslint-disable, @ts-ignore, or as any`
- 这三个抑制方法全是 JS/TS 生态的：`eslint-disable`（ESLint）、`@ts-ignore`（TypeScript）、`as any`（TypeScript）
- Python 对应规则：`# noqa`（flake8/ruff）、`# type: ignore`（mypy）、`# pyright: ignore`
- 影响：Worker 在 Python 项目中使用 noqa/type: ignore 时，协议规则无法覆盖——产生规则盲区

#### B6. 文档全部以 JS/TS 项目为例
- README.md 前置条件：要求 `package.json` + test/lint/typecheck/coverage 脚本
- docs/HOW_TO_NEW_PROJECT.md 前置条件清单第1条：`项目有 package.json`
- 影响：Python 用户看文档会认为 24hagent 不支持 Python

---

### C. 不需要改的部分（确认清单，经Codex审查确认）

以下组件对 Python 项目直接可用：

| 组件 | 文件 | Codex确认 |
|------|------|-----------|
| CLI 入口（路由） | [src/cli/main.ts](src/cli/main.ts) | 纯命令路由 |
| RealCommandRunner | [src/adapters/shell/command-runner.ts](src/adapters/shell/command-runner.ts) | 只执行 command 字符串，pytest 和 npm test 一样对待 |
| RunState schema | [src/core/schemas/run-state.ts](src/core/schemas/run-state.ts) | JSON schema |
| TaskPackage + Markdown解析 | [src/core/schemas/task-package.ts](src/core/schemas/task-package.ts) | 纯 Markdown 正则 |
| ReviewResult + JSONL解析 | [src/core/schemas/review-result.ts](src/core/schemas/review-result.ts) | YAML/JSONL |
| EvidencePacket | [src/core/schemas/evidence-packet.ts](src/core/schemas/evidence-packet.ts) | JSON schema |
| prompt-builder | [src/core/review/prompt-builder.ts](src/core/review/prompt-builder.ts) | 纯字符串拼接 |
| result-renderer | [src/core/review/result-renderer.ts](src/core/review/result-renderer.ts) | 只渲染 ReviewResult 为 Markdown，不解析目标项目输出 |
| evaluateThresholds | [src/core/quality/validation-engine.ts:31-43](src/core/quality/validation-engine.ts#L31-L43) | 纯数学比较（但需处理 unsupported 指标） |
| loadGateConfig/planGateExecutions/runConfiguredGates/evaluateGateResults | [src/core/quality/validation-engine.ts](src/core/quality/validation-engine.ts) | 操作 QUALITY_GATES.json 中的命令字符串 |
| validate 命令执行引擎 | [src/cli/validate.ts:7-10](src/cli/validate.ts#L7-L10) | 读取 JSON 中的 command 字段并执行，不关心命令是什么语言 |
| gate 名称（test/lint/typecheck/coverage） | QUALITY_GATES.json | 质量维度名，非生态专属 |

**关键结论**：24hagent 的约 85% 代码和逻辑不需要改动。需要改的集中在 readiness-engine.ts（工具链检测 + 项目文件读取）、validation-engine.ts（覆盖率解析 + CoverageData 模型）、CLAUDE_ORCHESTRATOR_PROTOCOL.md（协议规则语言分支）。

---

## 三、解决方案

### 总体策略：扩展现有代码，不重写

在现有 TypeScript 代码上增加 Python 项目检测分支，保持向后兼容。

### 需要修改的文件（5个源码 + 1个协议 + 2个文档）

#### 1. src/cli/readiness.ts —— 支持 pyproject.toml

```typescript
// 当前（第6-11行）：
const pkgPath = resolve(root, 'package.json')
if (!existsSync(pkgPath)) {
  console.error('readiness: package.json not found')
  process.exit(1)
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

// 改为：按优先级查找项目文件
// package.json → pyproject.toml → setup.cfg → 报错
```

#### 2. src/core/quality/readiness-engine.ts —— 扩展 detectToolchain()

核心改动：
- 新增 `detectPythonToolchain(root)` 函数
- TOML 解析策略改为**调用 Python 自身的 tomllib**（Python 项目必然有 Python 环境）：
  ```typescript
  const result = execSync('python -c "import tomllib,json,sys; print(json.dumps(tomllib.load(sys.stdin.buffer)))"', 
    { input: readFileSync(pyprojectPath) })
  ```
  降级方案：如果调用 Python 失败（无 Python 环境），回退到手写 TOML 子集解析器
- Python 工具检测映射表：

```
测试框架：pytest（查 [project.optional-dependencies] 或 [tool.pytest]）
Linter：ruff > pylint > flake8（查 dependencies 或 [tool.ruff]/[tool.pylint]）
Typechecker：mypy > pyright > pytype（查 dependencies 或 [tool.mypy]）
覆盖率：pytest-cov > coverage（查 dependencies）
包管理器：uv.lock > poetry.lock > pdm.lock > Pipfile > 默认 pip
```

- 修改 renderReadinessReport 的 Next Steps，根据项目类型给出对应建议：
  - Python：`pip install pytest ruff mypy coverage` 或 `uv add --dev pytest ruff mypy coverage`
  - Node：保持现有建议

#### 3. src/core/quality/validation-types.ts —— CoverageData 支持可选指标

```typescript
// 当前：强制四项
export interface CoverageData {
  lines: number; branches: number; functions: number; statements: number;
}

// 改为：branches 和 functions 可选（Python 不提供 functions）
export interface CoverageData {
  lines: number;
  branches: number | null;    // null = 工具不支持分支覆盖率
  functions: number | null;   // null = 工具不支持函数覆盖率
  statements: number;
}

// 新增覆盖率 profile 概念
export type CoverageProfile = 'vitest' | 'coverage_py';
// vitest: lines + branches + functions + statements 全支持
// coverage_py: lines + statements 支持，branches 可选支持，functions 不支持
```

#### 4. src/core/quality/validation-engine.ts —— 三处改动

**4a. parseCoverageFromRawOutput 扩展**：
```typescript
function parseCoverageFromRawOutput(rawOutput: string, profile?: CoverageProfile): CoverageData {
  if (profile === 'coverage_py' || (rawOutput.includes('"totals"') && rawOutput.includes('"percent_covered"'))) {
    return parseCoveragePyJson(rawOutput)
  }
  return parseVitestJson(rawOutput) // 现有逻辑
}
```

**4b. coverage.py JSON 字段映射（修正版，Codex BI-002 修复）**：
```
totals.percent_covered → lines
totals.covered_branches / totals.num_branches * 100 → branches（如果有 num_branches > 0，否则 null）
null → functions（coverage.py 不提供函数覆盖率，标记为不可用）
totals.percent_covered → statements
```

**4c. evaluateThresholds 处理 null 指标（Codex BI-002 修复）**：
```typescript
// 对于 null 的指标（如 functions），行为取决于 QUALITY_GATES.json 配置：
// - 如果 gate 的 threshold 中对应字段设为 0 或 null：跳过该指标，不阻塞
// - 如果 threshold 要求 >0 但 coverage 数据为 null：标记为 CONFIG_ERROR
```

**4d. Python coverage profile 的默认阈值**：
```json
{
  "coverage": {
    "enabled": true,
    "command": "pytest --cov --cov-report=json",
    "blocking": true,
    "profile": "coverage_py",
    "threshold": {
      "lines": 100,
      "branches": null,
      "functions": null,
      "statements": 100
    }
  }
}
```
branches 和 functions 设为 null 表示该指标不适用，不参与阻塞判定。

#### 5. CLAUDE_ORCHESTRATOR_PROTOCOL.md —— 协议规则语言分支（Codex BI-001 修复）

第139行改为：
```markdown
- NOT suppress linter/type errors:
  - JS/TS: eslint-disable, @ts-ignore, as any
  - Python: # noqa (flake8/ruff), # type: ignore (mypy), # pyright: ignore
```

#### 6. docs/HOW_TO_NEW_PROJECT.md —— 增加 Python 章节

前置条件改为：
```
- [ ] 项目有 package.json 或 pyproject.toml
- [ ] Python 项目：已安装 pytest + ruff + mypy + coverage
- [ ] Node 项目：已安装 vitest/jest + eslint + typescript
- [ ] Python 项目：确保 python 命令可用（24hagent 调用 python -c tomllib 解析配置）
```

默认质量门增加 Python 列：
```
| test | `npm test` 或 `pytest` | exit 0 |
| lint | `npx eslint src/` 或 `ruff check .` | exit 0 |
| typecheck | `npm run typecheck` 或 `mypy src/` | exit 0 |
| coverage | `npm run coverage` 或 `pytest --cov --cov-report=json` | lines+statements 100% |
```

#### 7. README.md —— 前置条件更新

"你的项目是 git 仓库，有 package.json" → "你的项目是 git 仓库，有 package.json 或 pyproject.toml"

---

## 四、Codex 审查发现与修复记录

| 审查问题 | 严重度 | 修复措施 |
|----------|--------|----------|
| BI-001: 协议层 eslint-disable/@ts-ignore 规则是 JS 专属 | BLOCKING | 新增 B5 问题 + 协议规则改为语言分支 |
| BI-002: coverage.py 的 percent_covered 映射到 functions 语义错误 | BLOCKING | CoverageData 改为可选字段 + 新增 coverage profile + null 处理策略 |
| BI-003: POC 用 Python tomllib 但方案推荐手写 TS TOML 解析器 | BLOCKING | 方案改为优先调 Python tomllib，降级回退手写解析器 |
| A4 阻塞级别：validate 执行引擎本身语言无关 | NON_BLOCKING | A4 降级为 B2，区分"默认配置问题"和"执行引擎问题" |
| 改动量估计遗漏文件 | NON_BLOCKING | 新增 validation-types.ts、CLAUDE_ORCHESTRATOR_PROTOCOL.md |

---

## 五、人类决策点（Codex 提出）

> Python coverage.py 没有函数覆盖率时，100% functions gate 应如何处理？

推荐方案：**Python profile 下 functions threshold 自动设为 null（不适用），不参与阻塞判定。**

理由：coverage.py 在 Python 生态是事实标准，它不提供函数级覆盖率是设计选择而非缺陷。强制要求函数覆盖率等于要求 Python 项目换工具——这不合理。让 QUALITY_GATES.json 的 coverage.threshold.functions 支持 null 值，null 表示跳过该指标。

---

## 六、改动量估计（Codex 修正后）

| 文件 | 改动类型 | 估计行数 |
|------|----------|----------|
| src/cli/readiness.ts | 修改 | ~20行（多项目文件查找） |
| src/core/quality/readiness-engine.ts | 扩展 | ~150行（detectPythonToolchain + renderReadinessReport 分支） |
| src/core/quality/validation-types.ts | 修改 | ~15行（CoverageData 可选字段 + CoverageProfile） |
| src/core/quality/validation-engine.ts | 扩展 | ~60行（parseCoveragePyJson + profile 路由 + null 处理 + 报告更新） |
| CLAUDE_ORCHESTRATOR_PROTOCOL.md | 修改 | ~5行（lint 规则语言分支） |
| docs/HOW_TO_NEW_PROJECT.md | 修改 | ~30行 |
| README.md | 修改 | ~5行 |
| tests/readiness-engine.test.ts | 新增测试 | ~60行 |
| tests/validation-engine.test.ts | 新增测试 | ~50行 |
| **合计** | | **~395行** |

---

## 七、风险

1. **TOML 解析降级路径**：Python tomllib 调用失败时的手写解析器可能无法处理复杂 TOML（多行字符串、内联表、数组表），但 pyproject.toml 的 `[project]` 段通常足够简单
2. **coverage.py 版本差异**：5.x 和 7.x 的 totals 字段结构有细微差异，需在 parseCoveragePyJson 中做防御
3. **Python 环境依赖**：工具链检测需要目标机器有 python 命令。如果 Python 项目但机器无 Python 环境——边缘情况，此时 readiness 报告 BLOCKED + 明确说明需要 Python
4. **branches 覆盖率的覆盖**：coverage.py 需要 `--branch` 参数才输出分支覆盖率，默认不输出。QUALITY_GATES.json 的命令需要包含此参数
5. **functions 指标的生态差异**：JS 生态将 functions 覆盖率视为核心指标，Python 生态不使用。这可能导致跨语言项目比较时的混淆
