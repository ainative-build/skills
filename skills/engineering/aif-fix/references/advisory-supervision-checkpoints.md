# Advisory Supervision (`--advice`)

When `--advice` is present, run this skill under `aif-kongming` supervision.
Load `../aif-brainstorm/references/advisory-supervision.md` for supervisor
identity, host detection, and model routing (Claude subscription → Fable 5;
Codex → `gpt-6-astra` + low effort; Cursor → `claude-fable-5-high`).

Spawn `aif-kongming` at these checkpoints:

- **After each phase or step completes** (Steps 1-6) — pass the goal, what
  changed, and the evidence; ask for a go/no-go and the next risk to watch.
- **When stuck** — the 3+ failed-attempt gate, a blocked step, or contradictory
  evidence; pass everything already tried and the exact obstacle before
  questioning the architecture.
- **On a failed verification** — any test, build, lint, type-check, repro, or a
  plan phase's own Verify step that misses its stated pass condition on a change
  you believed complete (not an expected-red step while iterating toward a known
  remaining error list). This is an objective trigger: it fires on every failed
  verification, including the first, whether or not you feel stuck. STOP before
  editing anything else and spawn `aif-kongming` with the exact command, its verbatim
  output, the change you just made, what you already tried, and the phase/task
  id. Counsel arrives before this skill's own failure branch runs — it informs
  that branch, never replaces it. If `aif-kongming` cannot be spawned, note once that
  advisory supervision is unavailable and continue under this skill's authoritative
  failure branch (the re-diagnose loop / `ask_user` gate); never treat missing
  counsel as license to self-reason a fix past a red check.
- **Before a high-stakes decision** — a design fork, a public-contract or
  security-sensitive change, or an irreversible action; get counsel first.

Treat `--advice` as active when the flag is passed OR the plan being executed
declares the `--advice` handover contract or contains a `## Failure Protocol`
block. Each phase file then carries its own Failure Protocol — honor it verbatim
on any failed Verify; it is the same rule travelling with the artifact.

**When the workflow reaches a PR** (e.g. a CI-failure fix shipped for review):
when handing off to a downstream skill, pass `--advice` along so supervision
persists. Watch and fix CI until every required check is green, then spawn
`aif-kongming` to review the whole implementation and post its assessment plus
concrete next steps as a comment directly on the PR and the source issue (when
one exists).
