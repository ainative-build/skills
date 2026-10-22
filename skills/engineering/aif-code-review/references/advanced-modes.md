## Pro-Max Verifier Mode (`--pro-max`)

When `--pro-max` is present, run the review as a best-of-5 verifier pass. The
controller runs the Stage 1 spec-compliance pass once, then fans **Stage 2**
(quality review) out to exactly five independent read-only reviewers in one
parallel wave over a shared evidence packet, and runs the final verification
gate once at the end.

- **Candidate task:** each reviewer independently produces a complete Stage 2
  review of the same scope with evidence (`file:line`) per finding.
- **Finalizer — union, not winner:** a single strongest-model verifier
  evidence-validates every candidate's findings, drops those it cannot confirm
  against cited evidence, and returns the **deduplicated union** of validated
  findings. The 1-20 ranking only orders severity and confidence; it never
  selects one review wholesale, because a real defect may surface in only one
  (possibly lower-ranked) candidate.
- **Conflict:** `--pro-max` hard-conflicts with `codebase parallel` (both own the
  multi-reviewer strategy). Passing both is a hard-stop naming both, never a
  silent resolution.

Full mechanics — evidence packet, anonymization, the five-usable-candidate gate
with one bounded re-dispatch, the fail-closed runtime rule, reject-all, and the
Stage mapping — are in `../../aif-brainstorm/references/pro-max-verifier-mode.md`.
`--pro-max` composes with the `#PR` / `COMMIT` / `--pending` / non-parallel
`codebase` input modes and with `--yagni`. It is a best-of-5 verifier mode
inspired by LLM-as-a-Verifier, not the full framework; never claim its
logprob/tournament algorithm.

## Advisory supervision (`--chef`)

When `--chef` is present, run this skill under `aif-chef` supervision.
Load `../../aif-brainstorm/references/advisory-supervision.md` for supervisor
identity, host detection, and model routing (Claude subscription → Fable 5;
Codex → `gpt-6-astra` + low effort; Cursor → `claude-fable-5-high`).

Spawn `aif-chef` at these checkpoints:

- **After Stage 1 (spec compliance) and after Stage 2 (quality review)** —
  pass scope, findings with evidence, and tentative severity; ask for
  go/no-go, missed risks, and over-reach.
- **When stuck** — contradictory evidence, unclear ownership, or repeated
  inconclusive scouting; pass approaches tried and the exact obstacle.
- **Before publishing a high-stakes verdict** (Request changes on a public
  contract, security finding, or large refactor) — get counsel first.

`--chef` composes with `--pro-max` and input modes; it never bypasses evidence
rules or the `codebase parallel` / `--pro-max` hard-conflict.
