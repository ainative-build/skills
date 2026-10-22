---
description: "Implement features, plans and fixes through a structured workflow."
argument-hint: "[task|plan-path] [--interactive|--fast|--parallel|--auto|--no-test] [--chef] [--yagni] [--skip-journal]"
---

# /aif:serve

Run the `aif-serve` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-serve/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
