# Current Task

## Task ID

`20260603-starter-aegis`

## Title

Migrate bundled starter onboarding to Aegis.

## Specification

Migrate the bundled starter from legacy 24Hagent / `.agent` onboarding to Aegis / `.aegis` onboarding.

This phase must:

- teach Aegis as the starter product identity
- install `.claude/skills/aegis-install/`
- initialize `.aegis/config`, `.aegis/current`, `.aegis/blueprint`, and `.aegis/state`
- generate `.aegis/current/next-claude-install-prompt.md`
- build `24hagent-starter/bin/aegis.mjs`
- keep legacy mentions only as compatibility or absence checks

Aegis must remain non-interactive and must not launch Claude Code or execute Codex by itself.

## File Scope

- .aegis/current
- .aegis/state/run-state.json
- 24hagent-starter
- scripts/build-starter.mjs
- tests/starter-layout.test.ts

## Definition of DoD

- [x] Starter README uses Aegis as the product identity.
- [x] Setup scripts create `.aegis/` runtime files and `aegis-install`.
- [x] Starter prompt routes Claude Code through `.claude/skills/aegis-install/SKILL.md`.
- [x] Starter CLI builds to `24hagent-starter/bin/aegis.mjs`.
- [x] Remaining legacy terms in starter are compatibility, generated fallback, or absence-check references only.

## Acceptance Checks

```bash
npm run typecheck
npm run build
npm run lint
npm test
npm run build:starter
npx vitest run tests/starter-layout.test.ts
rg -n "24Hagent|24hagent|\\.agent|24h" 24hagent-starter scripts/build-starter.mjs tests/starter-layout.test.ts
node dist\cli\main.js safety:check
node dist\cli\main.js task:review
git diff --check
git status --short --ignored
```

## Stop Rule

Stop and ask for human confirmation before changing dependency files, GitHub configuration, release/publish/deploy behavior, forbidden Git actions, or files outside the File Scope above.
