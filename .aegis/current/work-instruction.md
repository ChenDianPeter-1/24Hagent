# Work Instruction

## Task

Remove old 24Hagent `.agent` runtime fallback.

## Instruction

Make the active Aegis runtime `.aegis/` only. Remove legacy `.agent` fallback code and tests, update docs, rebuild the starter bundle, and preserve only historical fixture mentions or negative assertions that prove `.agent` is not created.

## Boundaries

- Do not exceed `current-task.md` file scope.
- Do not perform forbidden Git or release actions.
- Do not remove the `24h` CLI alias in this phase.
- Do not rename `24hagent-starter/` in this phase.
