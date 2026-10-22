---
description: "Ship a completed branch via tests, review, commit, push and PR, with official/beta aliases, Kongming advice and gated merge plus CI convergence."
argument-hint: "[official|stable|main|beta|dev|next] [--both] [--advice] [--merge] [--skip-tests] [--skip-review] [--skip-journal] [--skip-docs] [--dry-run]"
---

# /aif:ship

Run the `aif-ship` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-ship/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
