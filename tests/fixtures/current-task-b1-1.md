# Current Task

## Task ID

B1-1-ts-toolchain

## Title

TypeScript 工具链初始化：让根项目质量门从 BLOCKED 变为 READY

## Specification

给根项目装上真实的 test/lint/typecheck/coverage 工具链。不改任何 PS1 脚本。不写业务代码。只建构建配置 + 目录骨架。

1. package.json：真实 scripts + devDependencies（vitest、eslint、typescript、zod、@eslint/js、typescript-eslint、@vitest/coverage-v8）
2. tsconfig.json：strict 模式，target ES2020，rootDir src/
3. vitest.config.ts：node 环境，v8 coverage，100% 阈值
4. eslint.config.mjs：recommended + typescript-eslint
5. .gitignore：移除 package.json 行（之前被 gitignored，需要恢复跟踪）
6. 目录骨架：src/core/schemas/、tests/fixtures/

## File Scope

- package.json
- tsconfig.json
- vitest.config.ts
- eslint.config.mjs
- .gitignore
- src/core/schemas/.gitkeep
- tests/fixtures/.gitkeep

## Definition of DoD

- [ ] npm install 成功
- [ ] npm test 返回 exit 0
- [ ] npm run typecheck 返回 exit 0
- [ ] npm run lint 返回 exit 0
- [ ] check_quality_readiness.ps1 返回 READY
- [ ] Codex 审查 PASS

## Acceptance Checks

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1
# 预期输出: Verdict: **READY**
npm test && npm run typecheck && npm run lint
```

## Stop Rule

工具链配置连续 2 次失败 → HUMAN_HANDOFF
