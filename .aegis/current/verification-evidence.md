# Verification Evidence

Verification completed for this round:

- `npm run build:starter`: passed after rerun outside the sandbox because esbuild process spawn was blocked with `spawn EPERM`; generated `24hagent-starter/bin/aegis.mjs`.
- `rg -n "24Hagent|24hagent|\\.agent|24h" 24hagent-starter scripts/build-starter.mjs tests/starter-layout.test.ts`: remaining hits are the starter folder name, `24h` compatibility note, generated CLI legacy fallback paths, or tests asserting old skill/runtime paths are absent.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npx vitest run tests/starter-layout.test.ts`: passed after rerun outside the sandbox because Vitest/esbuild process spawn was blocked with `spawn EPERM`; 1 file / 4 tests passed.
- `npm test`: passed outside the sandbox; 26 files / 206 tests passed.
- `node dist\cli\main.js safety:check`: passed.
- `node dist\cli\main.js task:review`: passed.
- `git diff --check`: passed.

The starter now installs `aegis-install`, initializes `.aegis/` runtime state, generates `.aegis/current/next-claude-install-prompt.md`, and ships `bin/aegis.mjs`.
