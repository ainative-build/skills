# Ultra Verifier Mode (`--ultra`)

When `--ultra` is present, run Steps 0-2 once — the confirmed diagnosis joins
one immutable evidence packet — then fan ONLY the Step 3 solution selection and
fix-plan generation to exactly five independent read-only candidates in one
parallel wave; a single strongest-model verifier scores them.

- **Candidate task:** each candidate produces a complete fix plan — chosen
  repair, files to touch, ordered changes, risk notes, and verification steps —
  grounded in the confirmed diagnosis. Candidates never re-derive the confirmed
  root cause and never edit files.
- **Rubric:** cause-alignment (fixes the root cause, not the symptom), blast-
  radius safety, minimality, and verifiability of the plan's acceptance steps.
- **Finalizer:** the verifier selects the single winning fix plan unchanged (or
  rejects all); Steps 4-6 execute once from the winner. On reject-all,
  hard-stop and report why.

`--ultra` hard-conflicts with `--quick` and `--parallel` (quick skips the
deliberation ultra exists for; parallel owns the multi-agent strategy) — on
either combination, hard-stop and ask. Full mechanics are in
`../aif-brainstorm/references/ultra-verifier-mode.md`. It is a best-of-5
verifier mode inspired by LLM-as-a-Verifier, not the full framework.
