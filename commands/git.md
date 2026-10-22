---
description: "Run Git staging, commits, pushes and merges with conventional commits, auto-split by type/scope, and secret scanning."
argument-hint: "cm|cp|pr|merge|merge-pr|stack [args]"
---

# /aif:git

Run the `aif-git` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-git/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
