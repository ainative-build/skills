---
name: aif-fix
description: "Fix bugs, test failures, type and lint errors, log errors, UI defects and CI/CD failures with intelligent routing."
when_to_use: "Invoke when there is a concrete bug, error, or CI failure."
category: workflow
keywords: [bugfix, error, test-failure, CI, lint]
argument-hint: "[issue] --auto|--review|--quick|--parallel [--pro-max] [--chef]"
license: MIT
metadata:
  author: ainative-build
  version: "2.6.0"
  workflow:
    precedes: [aif-test]
---

# Fixing

Repair a concrete symptom, prove its cause before editing, and verify the repaired behavior.
Capture or reuse outcome, constraints, non-goals and acceptance criteria. Locate the failing
path, direct callers and relevant tests; record the failing command or observed behavior.

## Modes

- `--auto`: default; continue within authorized scope through repair and verification.
- `--review`: explicit human review at each major step.
- `--quick`: a bounded cause-aligned repair using `references/workflow-quick.md`.
- `--parallel`: independent issues with disjoint ownership and available delegation.
- `--chef`: supervisor checkpoints described below.
- `--pro-max`: post-diagnosis best-of-5 selection; conflicts with quick and parallel.

## Advisory supervision (`--chef`)

When `--chef` is present, run this skill under `aif-chef` supervision, as
defined by `../aif-brainstorm/references/advisory-supervision.md`. Load
`references/advisory-supervision-checkpoints.md` for supervisor identity and
model routing, the spawn checkpoints (after each step, when stuck, on any failed
verification, before a high-stakes decision), when to treat `--chef` as active,
and how supervision persists through a PR.


## Diagnose, repair and finish

Choose quick for a clear local cause, standard for multi-file work, and deep for architecture
or competing fixes. Read only that route. `references/diagnosis-gates.md` owns required cause
and verification evidence. Use a discriminating test for uncertainty; reasoning helpers are
optional, never an automatic activation chain. Preserve the opening scope and contracts.

Rerun the failing path after repair, then checks covering affected callers/contracts. Add a
regression test when it detects meaningful behavior; type/lint fixes can use their existing
checker. Reuse checks for unchanged source, inputs and environment. Review the actual diff;
independent review scales with risk and repository requirements, not every trivial fix.

Repair your regressions within the authorized scope. Ask only for a material missing decision,
a contract reversal or an unauthorized destructive action. After three failed repair attempts,
stop and reconsider the architecture with the user and evidence. With `--chef`, obtain
counsel on every failed verification before re-diagnosis or edits, including in quick mode.

Finalize by reconciling an existing plan if present, updating impacted docs and reporting
cause, changed paths, verification and limitations. Use available tracking; a missing
optional skill never blocks a local fix. Commit or publish only when already authorized.

## Pro-Max Verifier Mode (`--pro-max`)

`--pro-max` is the best-of-5 wave defined by
`../aif-brainstorm/references/pro-max-verifier-mode.md`. It fans ONLY the Step 3
solution selection to five independent read-only fix-plan candidates, which never
re-derive the confirmed root cause; one verifier then selects the single winning
fix plan. It hard-conflicts with `--quick` and `--parallel`. Load
`references/pro-max-verifier-mode-fix.md` for the evidence packet, candidate task,
rubric, finalizer, and conflict handling.


## References

Load as needed:
- `references/mode-selection.md` - ask_user capability format for mode
- `references/complexity-assessment.md` - Classification criteria
- `references/workflow-quick.md` - Quick: scout → diagnose → fix → verify+prevent → review
- `references/workflow-standard.md` - Standard: full pipeline with Tasks
- `references/workflow-deep.md` - Deep: research + brainstorm + plan with Tasks
- `references/review-cycle.md` - Review logic (autonomous vs HITL)
- `references/step-markers.md` - Unified step markers printed as each step completes
- `references/skill-activation-matrix.md` - When to activate each skill
- `references/parallel-exploration.md` - Parallel `aif-explore`/run_shell capability/Task coordination patterns
- `references/advisory-supervision-checkpoints.md` - `--chef` supervisor routing and spawn checkpoints
- `references/diagnosis-gates.md` - Exact-root-cause and no-side-effects gates
- `references/anti-rationalization.md` - Thought-vs-reality table for process shortcuts
- `references/pro-max-verifier-mode-fix.md` - `--pro-max` best-of-5 fix-plan selection

**Specialized Workflows:**
- `references/workflow-ci.md` - GitHub Actions/CI failures
- `references/workflow-logs.md` - Application log analysis
- `references/workflow-test.md` - Test suite failures
- `references/workflow-types.md` - TypeScript type errors
- `references/workflow-ui.md` - Visual/UI issues
