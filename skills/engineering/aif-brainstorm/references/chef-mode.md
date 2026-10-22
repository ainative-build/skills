## Advisory supervision (`--chef`)

When `--chef` is present, run this skill under `aif-chef` supervision.
Load `advisory-supervision.md` for supervisor identity, host
detection, and model routing (Claude subscription → Fable 5; Codex →
`gpt-6-astra` + low effort, falling back to sol, terra, then luna; Cursor → `claude-fable-5-high`).

Spawn `aif-chef` at these checkpoints:

- **After each phase, step, or decision round completes** — pass the goal, what
  changed or was concluded, and the evidence; ask for a go/no-go and the next
  risk to watch before continuing.
- **When stuck** — repeated failures, a blocked step, or contradictory evidence;
  pass everything already tried and the exact obstacle.
- **Before a high-stakes decision** — a design fork, a public-contract or
  security-sensitive change, or an irreversible action; get counsel first.

**When the workflow reaches a PR** (here, via the handed-off aif-plan/aif-serve/aif-fix
workflow): pass `--chef` to the downstream skill so supervision persists
across the handoff. Watch and fix CI until every required check is green, then
spawn `aif-chef` to review the whole implementation and post its assessment
plus concrete next steps as a comment directly on the PR and the source issue
(when one exists).
