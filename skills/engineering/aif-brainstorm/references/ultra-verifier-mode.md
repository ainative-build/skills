# Ultra Verifier Mode (`--ultra`)

Shared protocol for the opt-in `--ultra` mode of `aif-brainstorm`, `aif-plan`,
`aif-code-review`, `aif-advise`, `aif-scout`, `aif-research`, `aif-debug`,
`aif-fix`, `aif-problem-solving`, and `aif-test`. Each of those skills adds a short section
that sets its own candidate task and rubric, then defers to this file for the
mechanics.

## What this is (and is not)

`--ultra` is a **best-of-5 verifier mode inspired by LLM-as-a-Verifier**. The
controller generates several complete candidate outputs in parallel and a
single strongest-model verifier selects among them.

It is prompt orchestration only. It **does not implement** the external
LLM-as-a-Verifier framework: no logprob-expectation scoring, no repeated-
evaluation reward model, and no Probabilistic Pivot Tournament. Never describe
`--ultra` as running that algorithm, and never claim a numeric benchmark from
it.

## When it pays off

Verification scaling helps most when verifying is easier than generating — work
with a checkable outcome (a plan against acceptance criteria, a review against
evidence, a contract against constraints). For open-ended taste work with no
ground truth it adds cost without reliable signal; say so and prefer the default
path.

## Roles

- **Controller** — the main agent. Owns every file write, the evidence packet,
  the rubric, dispatch, and final materialization. Candidates never write shared
  artifacts; the controller alone does.
- **Candidates** — exactly five independent, read-only subagents. On runtimes
  that support per-subagent model-tier routing they run on the Opus tier;
  otherwise they run on the runtime's single strongest available tier (see the
  model-tier degrade note below).
- **Verifier** — one verifier subagent (Kongming). Model routing matches
  `--advice`: Claude Code subscription → `fable` (Fable 5); Codex →
  `gpt-6-astra` at low reasoning; see
  `advisory-supervision.md`. It runs on the runtime's strongest available
  model when tier routing exists; otherwise it shares the candidates' tier
  under the degrade note. Advisory: it scores and selects; it does not edit
  files.

## Fail-closed runtime rule

`--ultra` requires parallel read-only multi-candidate subagent dispatch — one
wave of five independent candidates. If that capability is missing — including
portable / `dispatch: none` and any runtime that can only run sequential or
single-agent simulation — **hard-stop**, tell the user `--ultra` is unsupported
on this runtime, and name the missing capability. Never fall back to sequential
dispatch, role-played fan-out, or a single default-model run. This dispatch
requirement is fail-closed: no parallel candidate dispatch, no `--ultra`.

Per-subagent model-tier routing is preferred, not required. When dispatch works
but tier routing does not, degrade under the model-tier note rather than
hard-stopping.

**Model-tier degrade.** Prefer distinct tiers: candidates on the Opus-class
generator tier and the verifier on the runtime's strongest available model. If
the runtime cannot assign per-subagent model tiers (e.g. role-typed subagents
that inherit one session model, as on Grok), keep `--ultra` only while parallel
read-only multi-candidate dispatch still works: run all five candidates and the
verifier on the same strongest available tier, and tell the user in one sentence
that this run is same-tier best-of-5 (independent samples + rubric selection),
not asymmetric verification. Do not claim a strongest-model verifier advantage
in that case. Same-tier runs inherit self-preference and correlated-error risk,
so reject-all and evidence-backed rubric scores stay mandatory, not optional.

## Protocol

1. **Build one immutable evidence packet.** Assemble the task/request text,
   confirmed constraints, acceptance criteria, and scouted file/evidence
   references once. This exact packet is passed identically into all five
   candidate prompts — that is what makes the candidates comparable.
2. **Build the rubric.** Define the skill-specific scoring criteria the verifier
   will apply (each skill's section lists its criteria). Criteria quality drives
   most of the result — make them concrete and checkable.
3. **Dispatch exactly five independent read-only candidates in one wave.** Send
   all five in a single parallel dispatch. Each prompt carries the same evidence
   packet; none may read another candidate's output, write shared files, or
   mutate session/plan state. Substitute only the candidate index.
4. **Enforce the usable-candidate gate.** A candidate is usable if its call
   returned without a terminal error and its output is non-empty and
   skill-shaped. Require all five usable. If any slot failed, run **one** bounded
   re-dispatch of only the failed slot(s). If fewer than five are usable after
   that, **hard-stop** with an actionable blocker naming which slots failed and
   why; never proceed on a partial pool or relabel it an ultra success.
5. **Anonymize before judging.** Strip author/order identity: present the five
   candidates to the verifier as an unordered, relabeled set (Candidate A..E with
   a randomized mapping the controller keeps privately). Never pass a candidate's
   self-rating to the verifier.
6. **Verify.** The verifier scores each candidate on each rubric criterion on a
   1-20 scale, applies any hard constraints, and returns a ranking with concise
   evidence-backed rationale and a confidence note.
7. **Reject-all is allowed.** If every candidate fails a hard constraint or the
   acceptance criteria, the verifier may **reject all candidates**. The
   controller then hard-stops and reports the ranking plus why nothing was
   materialized — it never falls back to the first candidate.
8. **Materialize (controller only).** The controller applies the skill-specific
   finalizer below, writes the final artifact, and records a short ranking
   appendix (winner/rationale, or the finding-union summary).
9. **Write the verifier receipt.** Append one line to the report or plan the run
   produced, so a later cohort can tell whether the fan-out earned its cost:

   ```
   ultra: picked=<k>/5 margin=high|low unanimous=yes|no rejected_all=yes|no
   ```

   `margin` is `high` when the winner leads the runner-up by more than a quarter
   of the rubric's full range on the deciding criteria, `low` otherwise; a `low`
   margin means the default single-pass path would likely have produced
   equivalent output at a fifth of the cost. `unanimous=yes` means the winner
   topped every rubric criterion. For union finalizers (`aif-code-review`,
   `aif-scout`) report coverage instead:

   ```
   ultra: union=<findings-kept>/<findings-proposed> single_candidate_only=<n>
   ```

   where `single_candidate_only` counts validated findings that appeared in
   exactly one candidate — the number that justifies the fan-out for union
   skills, since a one-candidate finding is what a single pass would have
   missed.

## Asymmetric finalizer

The finalizer differs by skill and MUST NOT be collapsed to one behavior:

- **`aif-brainstorm` and `aif-plan` select the single winning candidate.** The
  verifier picks one winner (or rejects all); the controller materializes that
  winner unchanged. It does not synthesize a new blended artifact, because a
  blend would not be the verified output.
- **`aif-advise` selects the single winning candidate advice.** The interview and
  reframing run once; only the advice generation is fanned to five candidates,
  and the verifier picks one winning advice unchanged (or rejects all). Same
  winner-selection rule as brainstorm/plan — never a union.
- **`aif-code-review` returns the evidence-validated, deduplicated union** of
  findings across the five reviews. The 1-20 ranking only orders severity and
  confidence; it never selects one review wholesale, because a real defect may
  appear in only one (possibly lower-ranked) candidate. The verifier drops
  findings it cannot validate against cited evidence and merges duplicates.
- **`aif-scout` returns the evidence-validated, deduplicated union of scouted findings**
  across the five scout passes — a relevant file may surface in only one
  candidate, so winner selection would lose coverage. The verifier drops paths
  it cannot validate and merges duplicates.
- **`aif-research` selects the single winning report** unchanged (or rejects
  all) — one coherent report beats a stitched blend.
- **`aif-debug` selects the single winning diagnosis** unchanged; the controller
  then verifies the winning root cause with fresh evidence before any fix.
  Candidates are read-only analysis passes — never fan mutating steps.
- **`aif-fix` selects the single winning fix plan** unchanged. The confirmed
  diagnosis is part of the immutable evidence packet; candidates propose fix
  plans and never re-derive the confirmed root cause.
- **`aif-problem-solving` selects the single winning reframing** unchanged
  (technique choice, application, and unblock path).
- **`aif-test` selects the single winning suite design or optimization plan**
  for `create`/`optimize` runs, and returns the evidence-validated,
  deduplicated union of audit findings for `audit` runs — a real deceptive
  test may be caught by only one candidate.

## Code-review Stage mapping

For `aif-code-review --ultra`, the controller runs the Stage 1 spec-compliance
pass once, fans **Stage 2** (quality review) out to the five independent
reviewers, and runs the final verification gate once over the deduplicated union
of validated findings. Stage 1 and the final gate keep their existing
single-pass semantics. `--ultra` hard-conflicts with `codebase parallel`
(both own the multi-reviewer strategy) — a combination is a hard-stop naming
both, never a silent resolution.

## Cost note

Five candidates plus one verifier costs several times a single run. Use `--ultra`
when the decision is load-bearing enough to justify it; the default path stays
the right choice for routine work.
