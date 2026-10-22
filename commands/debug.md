---
description: "Debug failing or misbehaving code by proving the root cause before any fix; diagnose why something fails, gives wrong output or is flaky in CI."
argument-hint: "[error or issue description] [--pro-max]"
---

# /aif:debug

Run the `aif-debug` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-debug/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
