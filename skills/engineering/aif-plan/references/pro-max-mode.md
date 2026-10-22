# Pro-Max Verifier Mode (`--pro-max`)

Best-of-5 independent candidate plans → single strongest-model verifier selection → materialize winner unchanged.

Follows the shared Pro-Max Verifier protocol in `../../aif-brainstorm/references/pro-max-verifier-mode.md`.

## Mode Exclusivity

- `--pro-max` cannot combine with `--fast`, `--hard`, `--deep`, `--parallel`, `--two`, `--debate`, or `--auto` (see `planning-rules.md` → Mode Exclusivity). Conflict is a hard stop.

## Execution Sequence

1. **Build shared evidence packet**: Assemble task, constraints, scouted files, and rubric once.
2. **Scaffold plan directory**: Run `plan.cjs create` per `cli-integration.md` and set the active plan with `plan.cjs use`.
3. **Mandatory generated-file read pass**: Read scaffolded stubs per `cli-integration.md`.
4. **Dispatch 5 parallel `aif-planner` subagents**: Each prompt carries identical evidence packet and writes to `.aif/reports/planner-pro-max-{YYMMDD-HHmm}-{slug}-candidate-{N}.md`.
5. **Usable candidate gate**: Require all 5 usable. Run one bounded re-dispatch of failed slots if needed.
6. **Anonymize & Verify**: Present 5 candidates to strongest-model verifier (`aif-chef`) as Candidate A..E.
7. **Materialize winner**: Write winning candidate into `plan.md` + `phase-*.md` unchanged; record ranking appendix in report.
8. **Run Red-Team & Validation gates**: Execute standard gates before task hydration.
