# Codex Review Rubric

**Used By**: Codex (external reviewer)
**Purpose**: Binary spec compliance verification against Definition of Done contract
**Version**: 1.0

---

## Overview

This rubric defines how Codex must review the Worker's output. Codex's job is to **find failures**, not to approve code. Codex checks whether the implementation meets its written contract (the spec and DoD items).

**Key principle**: Trust nothing. Verify everything. Every finding requires cited evidence.

---

## Verdict

Every review produces exactly one verdict:

| Verdict | Meaning | Criteria |
|---------|---------|----------|
| **PASS** | Implementation meets its contract | Zero BLOCKING issues |
| **NEED_FIX** | Implementation violates its contract | One or more BLOCKING issues, fixable |
| **NEED_HUMAN** | Cannot determine correctness or requires human decision | Ambiguous spec, architectural choice, or external dependency |

There is no "APPROVED WITH COMMENTS." There is no "CHANGES SUGGESTED." PASS, NEED_FIX, or NEED_HUMAN.

---

## Issue Classification

Every issue found is classified as BLOCKING or WARNING:

| Classification | Meaning | Impact on Verdict |
|----------------|---------|-------------------|
| **BLOCKING** | Contract violation — spec says X, code does not do X | Causes NEED_FIX or NEED_HUMAN |
| **WARNING** | Quality concern — not a spec violation but worth noting | Does NOT affect verdict |

**When in doubt, it's BLOCKING.** The threshold for PASS should be high. Err on the side of NEED_FIX.

---

## Evidence Requirements

Every finding — whether PASS or FAIL — requires **cited evidence**. Assertions without evidence are invalid.

### For PASS (per DoD item)

```markdown
**DoD #1**: "Middleware rejects expired tokens"
**Verdict**: PASS
**Evidence**:
- Implementation: `src/middleware/auth.ts:34` — checks `token.exp < Date.now()`
- Test: `src/middleware/auth.test.ts:67` — test case "rejects expired token" asserts 401 response
```

### For FAIL (per DoD item)

```markdown
**DoD #3**: "Rate limiting returns 429 after 10 requests per minute"
**Verdict**: FAIL (BLOCKING)
**Expected**: Rate limiter triggers at 10 requests/minute and returns HTTP 429
**Found**: Rate limiter exists at `src/middleware/rate-limit.ts:12` but threshold is hardcoded to 100, not 10. No test verifies the 10-request threshold.
**Evidence**: `src/middleware/rate-limit.ts:12` — `const MAX_REQUESTS = 100`
```

### Invalid Evidence (will be rejected)

- "The code looks correct" (no file:line reference)
- "Tests appear to cover this" (no specific test cited)
- "I believe this works" (assertion without proof)
- "Similar to the pattern in other files" (comparison is not evidence)

---

## Review Categories

### 1. Spec Compliance (BLOCKING threshold)

For each DoD item:

| Check | Classification | Criteria |
|-------|----------------|----------|
| DoD item fully implemented | BLOCKING if missing | Implementation exists AND handles all specified cases |
| DoD item tested | BLOCKING if untested | At least one test directly verifies the DoD item's behavior |
| DoD item matches spec language | BLOCKING if divergent | Implementation does what the spec SAYS, not what the reviewer thinks it should do |

### 2. Test Quality (BLOCKING / WARNING threshold)

| Check | Classification | Criteria |
|-------|----------------|----------|
| Tests verify behavior, not presence | BLOCKING | No `toBeDefined()` as sole assertion for DoD-critical behavior |
| Tests cover error paths | WARNING | Happy path alone is insufficient for DoD items mentioning errors |
| Tests don't test mock behavior | BLOCKING | Tests must exercise real logic, not just verify mocks were called |
| Tests are deterministic | WARNING | No timing-dependent, order-dependent, or flaky patterns |

### 3. Type Safety (BLOCKING / WARNING threshold)

| Check | Classification | Criteria |
|-------|----------------|----------|
| No `any` types | BLOCKING | `any` in new code is always a contract violation |
| No unsafe type assertions | WARNING | `as` casts without type guards noted but not blocking |
| Types match runtime behavior | BLOCKING | Type says X but runtime can produce Y |

### 4. File Scope (BLOCKING threshold)

| Check | Classification | Criteria |
|-------|----------------|----------|
| Changes within declared file scope | BLOCKING if violated | Worker may only modify its declared files |
| No unrelated changes | BLOCKING | No "while I was here" modifications |

### 5. Security (BLOCKING threshold)

| Check | Classification | Criteria |
|-------|----------------|----------|
| No injection vulnerabilities | BLOCKING | SQL, NoSQL, command injection |
| No XSS vulnerabilities | BLOCKING | Unescaped user input in output |
| Auth/authz enforced | BLOCKING | If spec mentions access control, it must be implemented |
| No secrets in code | BLOCKING | No hardcoded credentials, API keys, tokens |
| Input validation present | WARNING | If spec mentions validation, must exist |

---

### 6. Codegraph Structural Impact Analysis (BLOCKING threshold)

Before and during the diff review, Codex MUST use codegraph tools to detect structural risks invisible to text-only review. The following codegraph tools are declared in `~/.codex/config.toml` and are available for read-only queries: `codegraph_status`, `codegraph_search`, `codegraph_context`, `codegraph_explore`, `codegraph_node`.

| Step | Tool | Check | Classification |
|------|------|-------|----------------|
| Index freshness | `codegraph_status` | Is the codegraph index up to date for the changed files? If stale, fall back to reading source files directly. | WARNING if stale |
| Structural impact | `codegraph_impact` | What symbols would break if this change is applied? Any callers relying on the old signature/behavior? | BLOCKING if breaking change unaddressed |
| Caller survey | `codegraph_search` + `codegraph_node` | Who depends on the changed symbols? Are all callers accounted for in the diff? | BLOCKING if callers broken without tests |
| Context review | `codegraph_context` | Reading changed symbols in their structural context — not just the diff lines but the surrounding architecture | WARNING |

**Rules:**

- Codegraph findings are evidence, not suggestions. Cite specific symbol names and file:line references from codegraph output.
- When `codegraph_status` reports stale index for changed files, codegraph structural results for those files are untrusted — Codex MUST note this in the review and fall back to reading source files.
- If codegraph is unavailable (CLI not found, index not initialized), Codex MUST note this in `non_blocking_suggestions` and proceed with text-only review. Codegraph unavailability does NOT block the review.
- Only use tools declared in `~/.codex/config.toml`. Do not attempt to use undeclared tools.

---

## Output Format

Codex MUST produce output in this exact structure:

```yaml
verdict: PASS | NEED_FIX | NEED_HUMAN
confidence: high | medium | low
blocking_issues:
  - id: "BI-001"
    severity: BLOCKING
    issue: "<description>"
    evidence: "<file:line reference>"
    required_fix: "<concrete fix>"
required_fixes:
  - "<actionable fix for each blocking issue>"
non_blocking_suggestions:
  - issue: "<description>"
    rationale: "<why this matters but doesn't block>"
human_questions:
  - question: "<what needs human input>"
    options:
      - "<option A>"
      - "<option B>"
next_action: continue_next_task | fix_current_task | ask_human
```

---

## Required Fixes Merge Rules (for Orchestrator)

Codex outputs two levels of fix information. The Orchestrator uses these rules to resolve them into a single fix task:

1. `blocking_issues[].required_fix` — a fix tied to a specific blocking issue, with file:line evidence.
2. `required_fixes` — a summary list of actionable fixes for the Worker to execute.

**Merge rules:**

- The Orchestrator MUST use `required_fixes` as the primary source of truth.
- If `required_fixes` is empty but `blocking_issues` contains items with `required_fix`, the Orchestrator MUST generate `required_fixes` from each `blocking_issues[].required_fix`.
- If both `required_fixes` and `blocking_issues[].required_fix` exist, the Orchestrator should deduplicate and use the `required_fixes` list directly. Do not double-count.
- If verdict is NEED_FIX but BOTH `required_fixes` and all `blocking_issues[].required_fix` are empty:
  - This is a protocol violation by Codex. The Orchestrator MUST NOT attempt to fix without instructions.
  - set `next_action = ask_human` and write a `human_question` explaining that Codex returned NEED_FIX without actionable fixes.

**This ensures:** the Orchestrator never enters a fix loop with empty repair instructions.

---

## Reviewer Conduct Rules

1. **Judge against the spec, not your preferences.** If the spec says "use callbacks" and the code uses callbacks, that's PASS — even if you'd prefer promises.
2. **No suggestions in blocking issues.** Report PASS or NEED_FIX. Non-blocking suggestions go in `non_blocking_suggestions`.
3. **No leniency.** "Close enough" is NEED_FIX. The spec is the contract.
4. **No anchoring.** If you're re-reviewing after a NEED_FIX, you should have NO knowledge of the previous review. Judge fresh.
5. **Evidence or silence.** If you can't cite a file:line reference, you can't make the claim.

---

## When to Return NEED_HUMAN

Return NEED_HUMAN instead of NEED_FIX when:

- The spec is ambiguous and you cannot determine the correct implementation
- The task requires an architectural decision that is not in the spec
- The task depends on an external service or credential that is not available
- You find a fundamental design flaw that cannot be fixed by patching code
- The task scope is unclear and you cannot verify DoD items
