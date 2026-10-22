# Standard Workflow

Full pipeline for moderate complexity issues. Discover the live
task-management surface and use it for phase tracking when available.
Otherwise, update the active plan. Plan files are the durable source of truth.

The parent skill captures the opening intent frame before this route loads.

## Plan Setup (Before Starting)

Record the phase dependency order upfront. Mirror it into the live
task-management surface when available; otherwise keep it in the active plan.

- Scout codebase
- Diagnose root cause
- Implement fix, blocked by scout + diagnose
- Verify + prevent, blocked by implementation
- Code review, blocked by verification
- Finalize, blocked by review

## Steps

### Step 1: Scout Codebase
Record the scout phase as active.

**Mandatory skill chain:**
1. Activate `aif-scout` skill OR launch 2-3 parallel `aif-explore` subagents when delegation is explicitly requested/permitted.
2. Map: affected files, module boundaries, dependencies, related tests, recent git changes.

**Pattern:** If delegation is permitted, launch 2-3 `aif-explore` agents in one
assistant turn through `delegate_agent`. In Codex Desktop, expose deferred
multi-agent tools with `tool_search` first, then use
`multi_agent_v1.spawn_agent(agent_type="aif-explore", message="...")`.

See `references/parallel-exploration.md` for patterns.

Record the scout phase as completed after its evidence is captured.
**Output:** `✓ Step 1: Scouted [N] areas - [M] files, [K] tests found`

### Step 2: Diagnose Root Cause
Record the diagnose phase as active.

**Mandatory skill chain:**
1. **Capture pre-fix state:** Record exact error messages, failing test output, stack traces.
2. Activate `aif-debug` skill. Use `aif-debugger` subagent if needed.
3. Use `aif-deep-thinking` (sequential mode) only when a decision/evidence log would help — form hypotheses through structured reasoning.
4. Use delegated `aif-explore` subagents to test hypotheses only when delegation is explicitly requested/permitted.
5. If 2+ hypotheses fail → auto-activate `aif-problem-solving`.
6. Trace backward to root cause (not just symptom location).

Use the root-cause checklist in the parent skill as the diagnosis protocol.

Record the diagnose phase as completed after the root cause is proven.
**Output:** `✓ Step 2: Diagnosed - Root cause: [summary], Evidence: [brief], Scope: [N files]`

Before implementation, compare only cause-aligned fixes. Record the direct
choice and its fit with the opening acceptance criteria. If multiple viable
approaches or an architecture decision remain, activate `aif-brainstorm` and
escalate to Deep workflow for a plan.

### Step 3: Implement Fix
Record the implementation phase as active once scout and diagnosis are complete.

Fix the ROOT CAUSE per diagnosis findings. Not symptoms.

- Apply `aif-problem-solving` skill if stuck
- Use `aif-deep-thinking` (sequential mode) for complex logic
- Minimal changes. Follow existing patterns.
- Preserve the opening constraints and non-goals.

Record the implementation phase as completed.
**Output:** `✓ Step 3: Implemented - [N] files changed`

### Step 4: Verify + Prevent
Record the verify phase as active.

**Mandatory skill chain:**
1. **Iron-law verify:** Re-run the EXACT commands from pre-fix state capture. Compare before/after.
2. **Regression test:** Add/update test(s) covering the fixed issue. Test MUST fail without fix, pass with fix.
3. **Side-effect sweep (HARD-GATE-NO-SIDE-EFFECTS):** Walk each dependent caller of changed functions from Step 1 blast-radius. Run tests in modules that share files/contracts. Confirm public contracts (signatures, schemas, APIs, env vars) unchanged. See SKILL.md HARD-GATE-NO-SIDE-EFFECTS.
4. **Defense-in-depth:** Apply the relevant prevention layers from the parent skill.
5. **Verification commands:** Run typecheck, lint, build, and tests through the
   `run_shell` capability. Delegate verification only when the user explicitly
   requested parallel delegation and the runtime permits it.

**On regression / side effect:** repair implementation-caused failures within scope; ask only for a changed contract or unauthorized action. Under `--advice`, obtain counsel first.

**If verification fails:** Loop back to Step 2 (re-diagnose). Max 3 attempts.

Under `--advice`, a failed check is an objective `aif-oracle` trigger: STOP and spawn `aif-oracle` with the command, its output, and what you tried before re-diagnosing; never self-reason past a red check.

Record the verify phase as completed only after fresh evidence passes.
**Output:** `✓ Step 4: Verified + Prevented - [before/after], [N] tests added, [M] guards`

### Step 5: Code Review
Record the review phase as active.
Use `aif-code-reviewer` through `delegate_agent` when delegation is explicitly
requested/permitted; otherwise review the changed files locally.

See `references/review-cycle.md` for mode-specific handling.

Record the review phase as completed after accepted findings are resolved.
**Output:** `✓ Step 5: Review [score]/10 - [status]`

### Step 6: Finalize
Record the finalize phase as active.
- Report summary: root cause, changes, prevention measures, confidence score
- Reconcile the active plan with `plan.cjs` (tick proven boxes, update phase and plan status) per `../../aif-cook/references/plan-state-files-first.md`
- Evaluate docs impact and use `aif-docs-manager` only for affected authority surfaces
- Ask to commit via git workflow or delegated git-manager when explicitly requested/permitted
- Run `/aif-journal` — unless the shared "Journal step — opt-out" applies (see SKILL.md; skip when `--skip-journal` or `journal.auto=false`)

Record the finalize phase as completed in the live surface when available and in the active plan.
**Output:** `✓ Step 6: Complete - [action]`

## Skills/Subagents Activated

| Step | Skills/Subagents |
|------|------------------|
| 1 | `aif-scout` OR parallel `aif-explore` subagents when delegation is permitted |
| 2 | `aif-debug`, `aif-deep-thinking` (sequential mode), optional delegated debugger/`aif-explore` when permitted, optional `aif-problem-solving` when stuck, conditional `aif-brainstorm` after diagnosis |
| 3 | `aif-problem-solving` (if stuck), `aif-deep-thinking` (sequential mode) (complex logic) |
| 4 | `run_shell` verification; optional delegated tester/workers when permitted |
| 5 | `aif-code-reviewer` via `delegate_agent` when permitted, otherwise local review |
| 6 | `plan.cjs` sync-back; docs/git delegation only when permitted |

**Rules:** Don't skip steps. Validate before proceeding. One phase at a time.
**Frontend:** Use `aif-agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or any relevant project-native browser tests to verify.
**Visual Assets:** Use `aif-ai-multimodal` for visual assets generation, analysis and verification.
