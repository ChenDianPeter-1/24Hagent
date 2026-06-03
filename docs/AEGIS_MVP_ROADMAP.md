# Aegis MVP Roadmap

This roadmap turns the Aegis decisions into implementation phases. Each phase should have its own GitHub issue or issue comment and its own commit boundary.

## Phase 1: Product Repositioning And Runtime Spec

Goal: replace the old 24Hagent product mind with the Aegis delivery-gate product mind.

Deliverables:

- `docs/AEGIS_PRODUCT_DECISIONS.md`
- `docs/AEGIS_RUNTIME_SPEC.md`
- `docs/AEGIS_MVP_ROADMAP.md`
- README repositioning note
- `.gitignore` policy for `.aegis/`

Do not:

- Rewrite core TypeScript runtime yet.
- Remove `24h` compatibility yet.
- Automate Superpower yet.

## Phase 2: Aegis Runtime Scaffold

Goal: introduce `.aegis/` as the new runtime shape.

Deliverables:

- `.aegis/config/aegis.json`
- `.aegis/config/quality-gates.json`
- `.aegis/config/codex-rubric.md`
- `.aegis/blueprint/project-blueprint.md`
- `.aegis/blueprint/project-progress.md`
- `.aegis/state/run-state.json`
- `.aegis/current/current-task.md`
- `.aegis/current/status.md`
- `.aegis/current/work-instruction.md`
- `.aegis/current/round-summary.md`

Acceptance checks:

- Tracked files match the Git policy.
- Local runtime artifacts stay ignored.
- File names are English lowercase kebab-case.

## Phase 3: CLI Identity Migration

Goal: introduce `aegis` as the formal command identity.

Deliverables:

- Package `bin` exposes `aegis`.
- `24h` remains as a compatibility alias if needed.
- README and docs stop teaching `24h` as the primary command.
- Existing command handlers are mapped to Aegis concepts.

Acceptance checks:

- `npm run build`
- `npm test`
- Command smoke check after build.

## Phase 4: Non-Interactive State Engine

Goal: make `aegis` read run state and decide the next phase without terminal prompts.

Deliverables:

- Run state schema update.
- Status renderer.
- Work instruction renderer.
- Decision request renderer.
- Recovery behavior for stale derived files.

Acceptance checks:

- Unit tests for state routing.
- Unit tests for derived-file refresh.
- Unit tests for decision-request stop behavior.

## Phase 4B: Claude Code Contract

Goal: make the Claude Code host contract explicit and inspectable.

Deliverables:

- `docs/AEGIS_CLAUDE_CODE_CONTRACT.md`.
- `.aegis/config/claude-code-contract.md`.
- `aegis contract` command.

Acceptance checks:

- Contract states that Aegis does not launch Claude Code.
- Contract states that Claude Code reads Aegis navigation files and performs only the instructed next step.
- Contract states that Codex remains the final `PASS` / `NEED_FIX` / `NEED_HUMAN` reviewer.

## Phase 5: Blueprint Flow

Goal: implement the Aegis side of the Superpower blueprint handshake.

Deliverables:

- Blueprint draft storage.
- Blueprint summary renderer.
- Blueprint confirmation `decision-request.md`.
- Blueprint revision state.
- Light blueprint structure check.
- `aegis blueprint:start`.
- `aegis blueprint:summary`.
- `aegis blueprint:confirm`.

Important boundary: Aegis does not directly call Superpower. It generates instructions for Claude Code to use Superpower.

Initial implemented slice:

- `blueprint:start` prepares draft storage and navigation.
- `blueprint:summary` writes the summary and human decision request.
- `blueprint:confirm` promotes the draft and returns Aegis to `ready-for-task`.

## Phase 6: Current Task Generation

Goal: generate formal current tasks from confirmed blueprint and Superpower plan material.

Deliverables:

- `current-task.md` schema and parser.
- Small-task extraction logic.
- File scope validation.
- Acceptance checks validation.
- Stop rule validation.
- `aegis task:next`.
- Generated-task compatibility with `aegis task:review`.

Acceptance checks:

- Task too large fails.
- Missing file scope fails.
- Missing acceptance checks fails.
- High-risk file scope requires explicit permission.

Initial implemented slice:

- `task:next` renders a formal current task from the confirmed blueprint.
- Generated tasks include all required sections and pass `task:review`.
- High-risk file scope needs explicit human permission before construction.

## Phase 6B: Automatic Navigation Rendering

Goal: make navigation files deterministic derived artifacts.

Deliverables:

- Shared navigation refresh service.
- Stale `status.md` recovery.
- Stale `work-instruction.md` and `project-progress.md` recovery.
- Automatic `decision-request.md` rendering.
- Preserve bounded repair instructions for Codex `NEED_FIX`.

Acceptance checks:

- Running `aegis` regenerates stale navigation from run-state and task context.
- Decision-request states write a readable decision request.
- `NEED_FIX` continuation does not clobber bounded Codex repair instructions.

## Phase 7: Superpower Discipline Gate

Goal: verify that Claude Code followed the required Superpower discipline.

Deliverables:

- Source availability scan remains separate from round discipline evidence.
- Discipline evidence model.
- TDD evidence check.
- Planning evidence check.
- Systematic debugging evidence check.
- Verification-before-completion check.
- `discipline-report.md` renderer.

Acceptance checks:

- Missing discipline evidence fails before Codex review.
- A passing Superpower source scan alone does not make `discipline:check` pass.
- Passing discipline evidence allows validation to continue.

Implemented slice:

- `discipline:check` now uses a structured evidence model with status, summary, and failure issues.
- Placeholder or too-short evidence fails.
- Category-mismatched evidence fails even when the file exists.
- Source availability remains a separate check from current-round discipline evidence.

## Phase 8: Quality Gates And Codex Review

Goal: preserve and migrate the strongest existing 24Hagent value: Codex read-only review.

Deliverables:

- Quality gates read from `.aegis/config/quality-gates.json`.
- Codex rubric read from `.aegis/config/codex-rubric.md`.
- Evidence packet builder uses `.aegis/current/`.
- Codex prompt generation.
- Codex JSONL render.
- Verdict routing.

Acceptance checks:

- Codex remains read-only.
- Codex, not Aegis, is the final semantic `PASS` / `NEED_FIX` / `NEED_HUMAN` reviewer.
- Aegis only packages evidence, runs local prerequisite gates, parses Codex output, and routes deterministically.
- Aegis does not run forbidden Git or deploy actions.
- `PASS`, `NEED_FIX`, and `NEED_HUMAN` are routed distinctly.

## Phase 9: Auto, Allow, Ask Progression

Goal: implement continuation modes.

Deliverables:

- `auto` default mode.
- `allow` low-interruption mode with hard brakes.
- `ask` confirmation-heavy mode.
- Retry limits.
- Round limits.
- High-risk stop rules.

Acceptance checks:

- `allow` cannot run forever.
- `auto` stops for high-risk scope.
- `ask` writes decision requests.

## Phase 10: Safety Boundaries

Goal: hard-code forbidden actions and Git safety checks.

Deliverables:

- Built-in forbidden action list.
- Git dirty-worktree check.
- File scope impact check.
- Human handoff for hard-blocked cases.
- Commit suggestion renderer.

Acceptance checks:

- Aegis never executes commit, push, merge, release, deploy, publish, or history rewrite commands.
- Aegis can generate a commit message draft only after `PASS`.

## Long-Term Direction

Short term:

```text
Aegis = Claude Code Skill + local delivery gate
```

Middle term:

```text
Aegis = Claude Code workflow gate + Codex read-only review + Superpower discipline verification
```

Long term:

```text
Aegis = general AI coding task delivery acceptance layer
```

The long-term product is not "another coding agent." It is the layer that makes AI coding work resumable, reviewable, and harder to lose control of.
