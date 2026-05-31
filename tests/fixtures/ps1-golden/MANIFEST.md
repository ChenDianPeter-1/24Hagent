# PS1 Golden Fixture Manifest

生成时间：2026-05-31
来源：根项目 scripts/*.ps1 实际运行输出

## readiness/

| 文件 | 来源 | 用途 |
|------|------|------|
| package.json | 根项目当前 package.json | READY 状态的输入 |
| QUALITY_GATES.json | 根项目 .agent/QUALITY_GATES.json | 门配置输入 |
| QUALITY_READINESS_REPORT.md | check_quality_readiness.ps1 输出 | READY verdict 的 golden output |
| stdout.txt | check_quality_readiness.ps1 控制台输出 | 终端输出的 golden reference |
| blocked-package.json | 手工构造 | BLOCKED 状态的输入（占位符 test 脚本） |
| blocked-gates.json | 根项目 QUALITY_GATES.json 副本 | BLOCKED 状态的 gates 输入 |

## validation/

| 文件 | 来源 | 用途 |
|------|------|------|
| package.json | 根项目当前 package.json | 项目输入 |
| QUALITY_GATES.json | 根项目 .agent/QUALITY_GATES.json | 4 门全开配置 |
| VALIDATION_REPORT.md | validate_task.ps1 输出 | 4 gates PASS 的 golden output |
| stdout.txt | validate_task.ps1 控制台输出 | 终端输出的 golden reference |

## review/

| 文件 | 来源 | 用途 |
|------|------|------|
| CODEX_REVIEW_RUBRIC.md | .agent/CODEX_REVIEW_RUBRIC.md | 审查量表输入 |
| CURRENT_TASK.md | .agent/CURRENT_TASK.md | 任务包输入 |
| codex-review-pass.jsonl | B1-2 测试 fixture | PASS verdict 的 Codex JSONL |
| codex-review-need-fix.jsonl | .agent/codex-B0-rereview-raw.jsonl | NEED_FIX verdict 的 Codex JSONL |
| codex-review-need-human.jsonl | .agent/codex-review-raw.jsonl | NEED_HUMAN verdict 的 Codex JSONL |
