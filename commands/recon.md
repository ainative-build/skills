---
description: "Codebase reconnaissance — find the relevant files, dependents, tests, and governing spec for a target."
argument-hint: "<task | changed-files | question> [--spec]"
---

# /aif:recon

Run the `aif-recon` skill on the target described by `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-recon/SKILL.md` in full, then execute
its workflow against `$ARGUMENTS`: frame the target, wide-sweep with Glob/Grep, divide the tree
across parallel read-only subagents (or one sequential sweep), confirm true owners, trace dependents
and tests, discover the governing spec when `--spec` is given, and return one concise context report.
