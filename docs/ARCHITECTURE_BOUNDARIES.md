# Architecture Boundaries

Aegis uses `eslint-plugin-boundaries` as a lightweight guardrail for AI and human edits. The goal is to catch accidental cross-layer imports during `npm run lint`, without turning the repo into a heavy framework.

## Layers

| Layer | Path | Allowed role |
| --- | --- | --- |
| CLI | `src/cli/*` | Thin command glue. It may call core modules and adapters, but should not contain business logic. |
| Adapters | `src/adapters/*/*` | External command, shell, filesystem, and process adapters. They should not depend on CLI or core feature implementations. |
| Schemas | `src/core/schemas/*` | Zod schemas, parsers, and shared data types. They must stay independent from quality and review implementations. |
| Quality | `src/core/quality/*` | Readiness, validation, and task quality gates. They may use schemas, but must not depend on review. |
| Review | `src/core/review/*` | Codex evidence, prompt, and result rendering. They may use schemas, but must not depend on quality. |
| Tests | `tests/*` | Test code may import production layers. Production `src` code must not import tests. |

## Current Rule Shape

The first rule set is intentionally small:

- `schemas` cannot import CLI, adapters, quality, review, or tests.
- `quality` cannot import CLI, adapters, review, or tests.
- `review` cannot import CLI, adapters, quality, or tests.
- `adapters` cannot import CLI, quality, review, or tests.
- `cli` cannot import tests.
- `tests` may import production code.

When a future task needs to cross one of these boundaries, treat that as an architecture decision. Narrow the task, ask for human confirmation, or update this document and `eslint.config.mjs` in the same reviewed change.
