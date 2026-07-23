---
description: "Find architectural deepening opportunities in existing code — shallow modules to deepen, coupling to consolidate — ranked by evidence. Read-only until you pick one."
argument-hint: "[<path|area> | whole repo] [--html]"
---

# /aif:improve

Run the `aif-improve` skill on the target described by `$ARGUMENTS`.

Read and follow `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-improve/SKILL.md` in full, then execute
its workflow against `$ARGUMENTS`:

1. Explore — read any optional `CONTEXT.md` / `docs/adr/`, then map the target area (via the
   `aif-recon` skill if installed, else inline Glob/Grep + read), noting friction and applying the
   deletion test using `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-improve/references/module-depth.md`.
2. Present — evidence-backed candidate cards ranked by recommendation strength, per
   `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-improve/references/opportunity-report.md`; emit the
   `--html` visual report to the temp dir when asked. Ask the user which candidate to pursue. Do NOT
   design interfaces yet.
3. Deepen — only after the user picks one, design the interface with them per
   `${CLAUDE_PLUGIN_ROOT}/skills/engineering/aif-improve/references/deepening-patterns.md`, implement
   it, and verify through the new interface.

Read-only in steps 1–2; edits code in step 3 only, after the user chooses.
