# Axis 2 — Spec

**Question this axis answers:** does the implementation do what was actually asked — no less, no
unrequested more?

Well-written code that solves the wrong problem is still wrong. This axis is independent of code
quality: a change can pass Standards while failing Spec, and vice versa. Report under its own
heading; never merge with or re-rank against the other axes.

## Spec-source discovery (done by the orchestrator, handed to this pass)

The orchestrator resolves the spec source before dispatch (delegating to the `aif-recon` skill with
`--spec` when it is installed, otherwise doing it inline), in this order, and passes the result in:

1. Commit messages / PR description on the reviewed range — look for an issue reference (`#123`,
   `JIRA-45`, "closes …").
2. A path the user named explicitly.
3. A scan of `docs/`, `specs/`, `.scratch/`, `plans/` for a matching plan or PRD.
4. If nothing surfaces, the orchestrator asks the user in plain text. (Subagents cannot ask — so
   this pass always receives either a spec or an explicit "no spec available".)

If there is genuinely no spec, this axis reviews against the change's own stated intent (commit
message / PR title) and says so.

## What to check

- **Every requirement present.** List each acceptance criterion / requirement from the spec, then
  mark it against the actual diff: PASS (implemented), MISSING (required but absent), or PARTIAL
  (implemented but incomplete / edge cases unhandled). **Always evaluate against the WHOLE diff** —
  even when Standards/Adversarial fan out over file-groups, the Spec axis runs a single pass over the
  full change. A per-group Spec pass would mark another group's requirements MISSING; never do that.
- **No unrequested scope.** Flag additions that aren't in the spec as EXTRA — they may be
  justified, but they must be surfaced, not waved through. Silent scope creep is a Spec finding.
- **Behavior matches intent, not just presence.** A requirement can be "present" in code yet wrong:
  check the requirement's inputs → outputs and its named edge cases actually behave as specified.

## Output

Per the shared output format (`output-format.md` → Finding format): a `## Spec` section containing
the requirement checklist table (`# | Requirement | PASS/MISSING/PARTIAL/EXTRA | evidence`). Write
each MISSING/PARTIAL row that blocks as a full titled block (description → Evidence → Why it matters →
Fix); keep EXTRA / minor rows to one line. Call out the single most-significant Spec issue.

If the Spec axis finds a hard failure (a required behavior MISSING), the aggregator marks the other
axes' findings "provisional pending spec fix" — but keeps them; it does not discard or block them.
