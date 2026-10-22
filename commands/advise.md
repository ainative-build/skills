---
description: "Interview until user and agent share the outcome picture, preview it, then give evidence-backed advice."
argument-hint: "[prompt-or-url] [--md] [--github] [--agent] [--pro-max] [--yagni]"
---

# /aif:advise

Run the `aif-advise` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-advise/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
