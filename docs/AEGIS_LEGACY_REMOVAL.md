# Aegis Legacy Runtime Removal

Tracking issue: GitHub issue `#14`.

## Decision

Aegis is `.aegis/`-only for active runtime state.

The old `.agent/` runtime directory belonged to 24Hagent. It is no longer a
supported onboarding path, current-state store, review packet location, or
quality-gate location.

## Current Runtime Roots

New and existing Aegis projects use:

```text
.aegis/config/
.aegis/blueprint/
.aegis/current/
.aegis/state/
.aegis/archive/
```

Claude Code skills live under:

```text
.claude/skills/
```

## Removed Surface

The Aegis runtime no longer falls back to `.agent/` for:

- readiness
- validation
- task review
- status
- review prompt/render
- Codex evidence packet building

If a project still has only old 24Hagent `.agent/` files, migrate it through the
Aegis starter or create the `.aegis/` runtime files explicitly.

## Remaining Historical Mentions

Some tests and archived fixtures may still mention `.agent/` as historical input
data or as negative assertions proving the starter does not create old runtime
state. Those mentions are not active product behavior.
