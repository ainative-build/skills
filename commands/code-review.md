---
description: "Review code for bugs, regressions, maintainability, reliability and verification gaps with evidence."
argument-hint: "[#PR | COMMIT | --pending | codebase [parallel]] [--pro-max] [--chef] [--yagni]"
---

# /aif:code-review

Run the `aif-code-review` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-code-review/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
