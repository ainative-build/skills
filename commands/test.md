---
description: "Run unit, integration, e2e and UI tests with coverage analysis, build verification, visual regression and QA reports."
argument-hint: "[context] OR ui [url] OR create|optimize|audit [scope] [--chef] [--pro-max] [--interview]"
---

# /aif:test

Run the `aif-test` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-test/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
