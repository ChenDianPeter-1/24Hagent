# Current Task

## Task ID

B2-1-status-cli

## Title

status 命令：用 B1 的 schema 读 .agent/ 状态，输出三行摘要

## Specification

给根项目加一个 `status` 命令。这是 24Hagent 第一次改自己——B1 建的 schema 第一次被 B2 消费。

核心函数 `formatStatus(runState, taskPackage): string` 是纯函数：
- 接收已解析的 RunState 和 TaskPackage 对象
- 返回严格三行：当前阶段 / 当前任务 / 上次审查
- 不碰 fs、process、console、Date.now

I/O wrapper 只做三件事：读两个固定路径 → 调 B1 parser → 调 formatStatus → console.log。

## File Scope

- src/cli/status.ts
- tests/status.test.ts

## Definition of DoD

- [ ] formatStatus 纯函数：给定 RunState + TaskPackage → 三行字符串
- [ ] I/O wrapper：读 .agent/RUN_STATE.json + .agent/CURRENT_TASK.md → 输出
- [ ] 测试覆盖：INIT（null 字段）/ 运行中 / 完成 三种状态
- [ ] 测试覆盖：文件不存在 / JSON 损坏 → 非零 exit
- [ ] npm test / typecheck / lint / coverage 全 PASS
- [ ] Codex 审查 PASS

## Acceptance Checks

```
npm test && npm run typecheck && npm run lint && npm run coverage
```

## Stop Rule

- Codex NEED_HUMAN → HUMAN_HANDOFF
- 同一失败模式 2 次 → 停止并送 Codex
- 核心函数不准碰 fs/process/console——Codex 发现即 blocking
