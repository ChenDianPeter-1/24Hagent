# Review Evidence

Review focus for this round:

- Starter README must teach Aegis as the product.
- Setup scripts must create `.aegis/` runtime state, not `.agent/` onboarding state.
- Generated install prompt must route Claude Code through `aegis-install`.
- PowerShell wrappers must call the Aegis CLI without reintroducing the old runtime contract.
- Legacy terms must remain only as compatibility or absence-check references.

Review result:

- Starter README, setup scripts, install prompt, and install skill are Aegis-first.
- Old PowerShell scripts are thin Aegis CLI wrappers.
- Old `.agent` rubric scaffold was replaced by `.aegis/config/codex-rubric.md`.
- Remaining old terms are compatibility or generated fallback references, not onboarding instructions.
