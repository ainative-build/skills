---
description: "Three-axis adversarial code review (Standards / Spec / Adversarial). Auto-detects PR, commit, ref, --pending, or codebase."
argument-hint: "[#PR | <commit> | <ref> | --pending | codebase]"
---

# /aif:code-review

Run the `aif-code-review` skill on the target described by `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-code-review/SKILL.md` in full, then
execute its workflow against `$ARGUMENTS`:

1. Resolve the input mode and pin the fixed-point SHAs.
2. Discover the spec source and build the shared context pack.
3. Dispatch the three axes — in parallel isolated subagents here (Task tool available), one axis
   each — using `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-code-review/references/`.
4. Aggregate into three separate sections (never merged or re-ranked) per `output-format.md`.
5. Apply the verification gate before any pass/fixed claim.

For the parallel axes, spawn the `aif:code-reviewer` agent per axis with the axis brief + shared
context pack.
