---
description: "Write chronological technical journals that preserve work history without replacing current docs or ADRs."
argument-hint: "[topic or reflection]"
---

# /aif:journal

Run the `aif-journal` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-journal/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
