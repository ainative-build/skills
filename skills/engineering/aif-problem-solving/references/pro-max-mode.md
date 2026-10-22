## Pro-Max Verifier Mode (`--pro-max`)

When `--pro-max` is present, produce the reframing as a best-of-5 verifier pass.
The controller assembles one immutable evidence packet — the stuck problem,
what was already tried, constraints, and observed symptoms — plus a rubric,
dispatches exactly five independent read-only candidates in one parallel wave,
then a single strongest-model verifier scores them.

- **Candidate task:** each candidate produces a complete reframing — the
  technique it selected (with the symptom match), the technique applied to this
  problem, and a concrete unblock path with next actions.
- **Rubric:** symptom-to-technique fit, depth of application (specific, not
  generic), actionability of the unblock path, and honesty about residual
  unknowns.
- **Finalizer:** the verifier selects the single winning reframing unchanged
  (or rejects all); the controller applies that winner. On reject-all,
  hard-stop and report why.

Full mechanics — evidence packet, anonymization, the five-usable-candidate
gate, reject-all, and the fail-closed runtime rule — are in
`../../aif-brainstorm/references/pro-max-verifier-mode.md`. It is a best-of-5
verifier mode inspired by LLM-as-a-Verifier, not the full framework.
