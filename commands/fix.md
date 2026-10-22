---
description: "Fix bugs, test failures, type and lint errors, log errors, UI defects and CI/CD failures with intelligent routing."
argument-hint: "[issue] --auto|--review|--quick|--parallel [--pro-max] [--advice] [--skip-journal]"
---

# /aif:fix

Run the `aif-fix` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-fix/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
