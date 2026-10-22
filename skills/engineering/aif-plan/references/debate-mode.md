# Debate Mode (`--debate`)

Shared evidence → 3 independent candidate plans → synthesize one final plan → Red Team → Validate → Hydrate Tasks.

Unlike `--two` (2 approaches drafted by the same planning pass, user picks one), `--debate` runs 3 fully independent `aif-planner` subagents with no cross-reading, and the orchestrator synthesizes one plan from all 3, recording agreements/disagreements explicitly.

## Compatibility & Exclusivity

- `red-team-workflow.md` and `validate-workflow.md` require zero changes for this mode.
- **Mode Exclusivity:** `--debate` cannot combine with `--fast`, `--hard`, `--deep`, `--parallel`, `--two`, or `--auto` (see `planning-rules.md` → Mode Exclusivity). Conflict is a hard stop.

## Execution Sequence

1. **Build the shared evidence packet**: Run the same research step `--hard` mode uses (max 2 `aif-researcher` agents in parallel) and persist to `{plan-dir}/reports/debate-evidence-packet.md`.
2. **Scaffold plan directory**: Run `plan.cjs create` per `cli-integration.md` and set the active plan with `plan.cjs use`.
3. **Mandatory generated-file read pass**: Read scaffolded stubs per `cli-integration.md`.
4. **Dispatch 3 parallel `aif-planner` subagents**: Build prompts from the shared evidence packet; each writes to `{plan-dir}/reports/planner-debate-candidate-{N}.md`.
5. **Usable candidate gate**: Verify all 3 candidates produced valid plans. If any slot fails, run one bounded re-dispatch.
6. **Synthesize one plan**: Compare candidate architectures, identify consensus and disagreements, and write final `plan.md` + `phase-*.md`.
7. **Run Red-Team & Validation gates**: Execute standard gates before task hydration.
