## Advisory supervision (`--advice`)

When `--advice` is present, run this skill under `aif-oracle` supervision.
Load `../../aif-brainstorm/references/advisory-supervision.md` for supervisor
identity, host detection, and model routing (Claude subscription → Fable 5;
Codex → `gpt-6-astra` + low effort; Cursor → `claude-fable-5-high`).

Spawn `aif-oracle` at these checkpoints:

- **After each phase completes** — pass the phase goal, what changed, and the
  evidence; ask for a go/no-go and the next risk to watch before the next phase.
- **When stuck** — repeated failures, a blocked step, or contradictory evidence;
  pass everything already tried and the exact obstacle.
- **On a failed verification** — any test, build, lint, type-check, or a plan
  phase's own Verify step that misses its stated pass condition on a change you
  believed complete (not an expected-red step while iterating toward a known
  remaining error list). This is an objective trigger: it fires on every failed
  verification, including the first, whether or not you feel stuck. STOP before
  editing anything else and spawn `aif-oracle` with the exact command, its verbatim
  output, the change you just made, what you already tried, and the phase/task
  id. Counsel arrives before this skill's own failure branch runs — it informs
  that branch, never replaces it. If `aif-oracle` cannot be spawned, note once that
  advisory supervision is unavailable and continue under this skill's own
  authoritative failure gates; never treat missing counsel as license to
  self-reason a fix past a red check.
- **Before a high-stakes decision** — a design fork, a public-contract or
  security-sensitive change, or an irreversible action; get counsel first.

Treat `--advice` as active when the flag is passed OR the plan being executed
declares the `--advice` handover contract or contains a `## Failure Protocol`
block. Each phase file then carries its own Failure Protocol — honor it verbatim
on any failed Verify; it is the same rule travelling with the artifact.

**When the workflow reaches a PR** (e.g. handed off to the installed ship
skill): pass `--advice` to the downstream skill so supervision persists across
the handoff. Watch and fix CI until every required check is green, then spawn
`aif-oracle` to review the whole implementation and post its assessment plus
concrete next steps as a comment directly on the PR and the source issue (when
one exists).
