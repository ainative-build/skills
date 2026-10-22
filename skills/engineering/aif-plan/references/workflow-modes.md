# Workflow Modes

## Auto-Detection (Default Planning Mode)

When no flag specified, analyze task and pick mode:

| Signal | Mode | Rationale |
|--------|------|-----------|
| Simple task, clear scope, no unknowns | fast | Skip research overhead |
| Complex task, unfamiliar domain, new tech | hard | Research needed |
| Major refactor, 5+ areas, architectural debt | deep | Need per-phase scouting |
| 3+ independent features/layers/modules | parallel | Enable concurrent agents |
| Ambiguous approach, multiple valid paths | two | Compare alternatives |

Use `ask_user capability` if detection is uncertain. `debate` and `ultra` are never detection outcomes — each is explicit opt-in only (`--debate`, `--ultra`), never chosen by this heuristic table.

## Scope Challenge Integration

Step 0 (Scope Challenge, see `scope-challenge.md`) runs before mode detection and can influence it. Without `--yagni`, it records HOLD SCOPE without presenting a scope-reduction fork:
- If user selects **EXPANSION** → auto-suggest `--hard` or `--two`
- If user selects **REDUCTION** → auto-suggest `--fast`
- If user selects **HOLD** → proceed with auto-detected mode

Mode can still be overridden by explicit flags (`--fast`, `--hard`, etc.). The scope step is skipped only when the task is trivial. `--fast` changes planning depth only; it does not authorize scope reduction. Preserve the full requested scope unless the user passes `--yagni` or directly instructs a named cut.

## Fast Mode (`--fast`)

No research. Analyze → Plan → Hydrate Tasks. Fast mode reduces workflow depth, not the requested product scope.

1. Read repository instructions and follow existing documentation navigation to locate current requirements, architecture, and standards; confirm them against relevant source and tests.
2. Use `aif-planner` subagent to create plan.
3. Hydrate tasks (unless `--no-tasks`).
4. **Implementation option:** `/aif-cook {absolute-plan-path}/plan.md`.

## Hard Mode (`--hard`)

Research → Scout → Plan → Red Team → Validate → Hydrate Tasks.

1. Spawn max 2 `aif-researcher` agents in parallel.
2. Read repository instructions and use `/aif-scout` when owning evidence is missing or ambiguous.
3. Gather research + scout report filepaths → pass to `aif-planner` subagent.
4. Post-plan red team review (see `red-team-workflow.md`).
5. Post-plan validation (see `validate-workflow.md`).
6. Hydrate tasks (unless `--no-tasks`).

## Deep Mode (`--deep`)

Per-phase scouting for large architectural overhauls.

1. Research + Scout Phase 1.
2. Plan Phase 1 in detail, outline Phases 2+.
3. During cook, each subsequent phase gets a dedicated scout pass before execution.
4. Post-plan red team review & validation.

## Parallel Mode (`--parallel`)

Designed for parallel execution with strict file ownership.

1. Research & design decoupled modular architecture.
2. Decompose into phases with strictly disjoint file boundaries.
3. Post-plan red team review & validation.
4. Pass plan to `/aif-cook --parallel`.

## Two Approaches Mode (`--two`)

Researches and presents 2 distinct architectural solutions with concrete trade-offs for user selection.

1. Research both viable technical approaches.
2. Draft candidate architectures and trade-off matrix.
3. Present approaches via `ask_user capability`.
4. Materialize the selected approach into full plan phases.

## Debate Mode (`--debate`)

3 independent aif-planner subagents draft candidate plans in parallel; the orchestrator synthesizes the best ideas into one unified plan. See `debate-mode.md`.

## Ultra Verifier Mode (`--ultra`)

Best-of-5 independent candidate plans scored and ranked by a single strongest-model verifier (`aif-kongming`). The winning plan is materialized unchanged. See `ultra-mode.md`.
