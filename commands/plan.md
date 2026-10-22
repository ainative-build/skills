---
description: "Create, validate or review implementation plans with acceptance criteria and executable phases; /aif:serve implements them."
argument-hint: "[task] [--fast|--hard|--deep|--parallel|--two|--debate|--pro-max] [--no-tasks] [--github] [--chef] [--yagni] [--skip-journal] OR [archive|red-team|validate]"
---

# /aif:plan

Run the `aif-plan` skill on `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-plan/SKILL.md` in full, then execute its
workflow against `$ARGUMENTS`. Load its `references/` files only when the skill says to.
