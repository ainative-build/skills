# Deep Workflow

Full pipeline with research, brainstorming, and planning for complex issues.
Discover the live task-management surface and use it for dependency tracking
when available. Otherwise, update the active plan. Plan files are the durable
source of truth.

The parent skill's opening intent frame is already satisfied. The brainstorm in
this route is a later solution decision grounded in diagnosis; it does not
replace or repeat the opening contract.

## Plan Setup (Before Starting)

Record phase dependencies upfront. Steps 1+2+3 may run in parallel when the
runtime permits the needed delegation.

- Scout codebase
- Diagnose root cause
- Research solutions
- Brainstorm approaches, blocked by scout + diagnose + research
- Create implementation plan, blocked by brainstorm
- Implement fix, blocked by plan
- Verify + prevent, blocked by implementation
- Code review, blocked by verification
- Finalize & docs, blocked by review

## Steps

### Step 1: Scout Codebase (parallel with Steps 2+3)
Record the scout phase as active.

**Mandatory:** Activate `aif-recon` skill or, when delegation is permitted,
launch 2-3 `aif-explore` subagents in parallel through `delegate_agent`. In Codex
Desktop, expose deferred multi-agent tools with `tool_search` first, then use
`multi_agent_v1.spawn_agent(agent_type="aif-explore", message="...")`.

Map: all affected files, module boundaries, call chains, test coverage gaps.

See `references/parallel-exploration.md` for patterns.

Record the scout phase as completed after its evidence is captured.
**Output:** `✓ Step 1: Scouted - [N] files, system impact: [scope]`

### Step 2: Diagnose Root Cause (parallel with Steps 1+3)
Record the diagnose phase as active.

**Mandatory skill chain:**
1. **Capture pre-fix state:** Record ALL error messages, failing tests, stack traces, logs.
2. Activate `aif-debug` skill (systematic-debugging + root-cause-tracing).
3. Use `aif-deep-thinking` (sequential mode) only when a decision/evidence log would help — structured hypothesis formation.
4. Use delegated `aif-explore` subagents to test hypotheses only when delegation is explicitly requested/permitted.
5. If 2+ hypotheses fail → auto-activate `aif-problem-solving`.
6. Trace backward through call chain to ROOT CAUSE origin.

Use the root-cause checklist in the parent skill as the diagnosis protocol.

Record the diagnose phase as completed after the root cause is proven.
**Output:** `✓ Step 2: Diagnosed - Root cause: [summary], Evidence: [chain]`

### Step 3: Research (parallel with Steps 1+2)
Record the research phase as active.
Use `aif-researcher` through `delegate_agent` only when delegation is explicitly requested/permitted.

- Search latest docs, best practices
- Find similar issues/solutions
- Gather security advisories if relevant

Record the research phase as completed after relevant evidence is retained.
**Output:** `✓ Step 3: Research complete - [key findings]`

### Step 4: Brainstorm
Record brainstorming as active after scout, diagnosis, and research are complete.
Activate `aif-brainstorm` skill.

- Evaluate multiple approaches using scout + diagnosis + research findings
- Consider trade-offs
- Compare each option with the opening constraints, non-goals, and acceptance
  criteria
- Resolve the preferred direction; explicit auto mode may use the documented
  recommendation without a routine pause

Record brainstorming as completed after the direction is resolved.
**Output:** `✓ Step 4: Approach selected - [chosen approach]`

### Step 5: Plan
Record planning as active.
Use delegated `aif-planner` only when delegation is explicitly requested/permitted;
otherwise write the plan locally.

- Break down into phases
- Identify dependencies
- Define success criteria
- Include prevention measures in plan

Record planning as completed after the durable plan is written.
**Output:** `✓ Step 5: Plan created - [N] phases`

### Step 6: Implement
Record implementation as active.
Implement the cause-aligned plan. Use context or reasoning aids only when their specific capability is needed.

- Fix ROOT CAUSE per diagnosis — not symptoms
- Follow plan phases
- Minimal changes per phase

Record implementation as completed.
**Output:** `✓ Step 6: Implemented - [N] files, [M] phases`

### Step 7: Verify + Prevent
Record verification as active.

**Mandatory skill chain:**
1. **Iron-law verify:** Re-run EXACT commands from pre-fix state. Compare before/after.
2. **Regression test:** Add comprehensive tests. Tests MUST fail without fix, pass with fix.
3. **Side-effect sweep (HARD-GATE-NO-SIDE-EFFECTS):** Walk each dependent caller of changed functions from Step 1 blast-radius. Run tests in modules that share files/contracts. Confirm public contracts (signatures, schemas, APIs, env vars) unchanged. See SKILL.md HARD-GATE-NO-SIDE-EFFECTS.
4. **Defense-in-depth:** Apply all relevant prevention layers from the parent skill.
5. **Verification commands:** Run typecheck + lint + build + test through `run_shell`; delegate only when explicitly requested/permitted.
6. **Edge cases:** Test boundary conditions, security implications, performance impact.

**On regression / side effect:** repair implementation-caused failures within scope; ask only for a changed contract or unauthorized action. Under `--chef`, obtain counsel first.

**If verification fails:** Loop back to Step 2 (re-diagnose). Max 3 attempts → question architecture.

Under `--chef`, a failed check is an objective `aif-chef` trigger: STOP and spawn `aif-chef` with the command, its output, and what you tried before re-diagnosing; never self-reason past a red check.

Use the prevention checklist in the parent skill.

Record verification as completed only after fresh evidence passes.
**Output:** `✓ Step 7: Verified + Prevented - [before/after], [N] tests, [M] guards`

### Step 8: Code Review
Record review as active.
Use delegated `aif-code-reviewer` only when delegation is explicitly requested/permitted; otherwise review locally.

See `references/review-cycle.md` for mode-specific handling.

Record review as completed after accepted findings are resolved.
**Output:** `✓ Step 8: Review [score]/10 - [status]`

### Step 9: Finalize
Record finalization as active.
- Report summary: root cause, evidence chain, changes, prevention measures, confidence score
- Reconcile the active plan with `plan.cjs` (tick proven boxes, update phase and plan status) per `../../aif-serve/references/plan-state-files-first.md`
- Evaluate docs impact; use delegated docs-manager only for affected authority
  surfaces and git-manager only when explicitly requested/permitted
- Run `/aif-journal` — unless the shared "Journal step — opt-out" applies (see SKILL.md; skip when `--skip-journal` or `journal.auto=false`)

Record finalization as completed in the live surface when available and in the active plan.
**Output:** `✓ Step 9: Complete - [actions taken]`

## Skills/Subagents Activated

| Step | Skills/Subagents |
|------|------------------|
| 1 | `aif-recon` OR parallel `aif-explore` subagents when delegation is permitted |
| 2 | `aif-debug`, `aif-deep-thinking` (sequential mode), optional delegated `aif-explore` when permitted, optional `aif-problem-solving` when stuck |
| 3 | `aif-researcher` via `delegate_agent` when permitted |
| 4 | `aif-brainstorm` |
| 5 | `aif-planner` |
| 6 | `aif-problem-solving`, `aif-deep-thinking` (sequential mode) |
| 7 | `run_shell` verification; optional delegated tester when permitted |
| 8 | `aif-code-reviewer` via `delegate_agent` when permitted, otherwise local review |
| 9 | `plan.cjs` sync-back; docs/git delegation only when permitted |

**Rules:** Don't skip steps. Validate before proceeding. One phase at a time.
**Frontend:** Use `aif-agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or any relevant project-native browser tests to verify.
**Visual Assets:** Use `aif-ai-multimodal` for visual assets generation, analysis and verification.
