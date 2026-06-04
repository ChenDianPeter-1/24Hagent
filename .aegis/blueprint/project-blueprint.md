# Aegis Project Blueprint

## Product Goal

Rewrite 24Hagent into Aegis: a delivery gate that lives inside Claude Code, uses Superpower as the engineering discipline source, and communicates with Codex for read-only external review.

## Product Formula

```text
Aegis = Superpower discipline + Claude Code construction + Aegis gates + Codex review
```

## MVP Scope

- Reposition the product from `24Hagent` to `Aegis`.
- Introduce `.aegis/` runtime state.
- Make `aegis` the product command identity.
- Preserve existing quality gate and Codex review value.
- Add non-interactive state progression.
- Add Superpower file-reference integration.
- Add discipline evidence checks.
- Enforce Git and release safety boundaries.

## Out Of Scope For Early MVP

- Aegis directly calling models.
- Aegis directly editing product code.
- Aegis automatically committing, pushing, merging, releasing, publishing, or deploying.
- Replacing Claude Code.
- Building a general multi-agent platform before the local Claude Code workflow is stable.

## Authoritative Inputs

- `D:\Desktop\ChatGPT-查看私密仓库权限.md`
- `docs/AEGIS_PRODUCT_DECISIONS.md`
- `docs/AEGIS_RUNTIME_SPEC.md`
- `docs/AEGIS_MVP_ROADMAP.md`
- `D:\AAAOddsAndEnds\PROGRAM\superpowers`
- GitHub issue `#14`
