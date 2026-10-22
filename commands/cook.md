---
description: "Implement features, plans and fixes through a structured workflow."
argument-hint: "[task|plan-path] [--interactive|--fast|--parallel|--auto|--no-test] [--tdd] [--advice] [--yagni] [--skip-journal]"
---

# /aif:cook

Run the `aif-cook` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-cook/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
