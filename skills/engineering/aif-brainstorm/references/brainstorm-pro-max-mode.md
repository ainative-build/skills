## Pro-Max Verifier Mode (`--pro-max`)

When `--pro-max` is present, run the brainstorm as a best-of-5 verifier pass
instead of a single draft. The controller builds one immutable evidence packet
plus a rubric, dispatches exactly five independent read-only candidate
brainstorms in one parallel wave, then a single strongest-model verifier scores
and ranks them and selects the winning candidate (or rejects all).

- **Candidate task:** each candidate produces a complete bounded contract —
  outcome, constraints, non-goals, acceptance criteria, plus Trade-offs and
  Better approaches when applicable — and its recommended direction.
- **Rubric:** faithfulness to the request, evidence grounding, sharpness of the
  acceptance criteria, honesty about unknowns, and correct application of
  conditional fields (including Trade-offs assumption/failure analysis and the
  required omission-versus-evidence-backed-none behavior for Better approaches).
- **Finalizer:** the verifier selects the single winning contract; the
  controller emits that winner unchanged (it does not blend candidates) and
  records a short ranking appendix. On reject-all, hard-stop and report why.

Full mechanics — evidence packet, anonymization, the five-usable-candidate gate
with one bounded re-dispatch, the fail-closed runtime rule, and reject-all — are
in `pro-max-verifier-mode.md`. `--pro-max` composes with
`--report`, `--advice`, and `--yagni`, and adds no new conflicts. It is a best-of-5 verifier
mode inspired by LLM-as-a-Verifier, not the full framework; never claim its
logprob/tournament algorithm.
