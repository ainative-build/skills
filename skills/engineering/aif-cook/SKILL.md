---
name: aif-cook
description: "Implement features, plans and fixes through a structured workflow."
when_to_use: "Invoke to implement known scope after requirements are clear."
category: workflow
keywords: [implementation, workflow, feature, pipeline]
argument-hint: "[task|plan-path] [--interactive|--fast|--parallel|--auto|--no-test] [--tdd] [--advice] [--yagni] [--skip-journal]"
license: MIT
metadata:
  author: ainative-build
  version: "2.5.1"
  workflow:
    follows: [aif-plan]
    precedes: [aif-test]
---

# Cook

Invoke `/aif-cook <task|plan-path> [flags]` in Claude Code; use the runtime's
installed invocation form elsewhere.

Implement the full authorized outcome through verification and review. Capture or reuse
outcome, constraints, non-goals and acceptance criteria; inspect nearby code and tests.
Ask only for a material missing decision or an action outside that authorization.
Repair regressions caused by the change and rerun affected checks before finishing.

## Select a mode

| Input | Route |
|---|---|
| No flag | Continue authorized implementation, checks, review and completion |
| Accepted plan path | Execute the plan with current evidence; retain its explicit modes |
| `--interactive` | Pause for user review at major steps |
| `--fast` | Skip research; inspect, make a concise plan, implement and verify |
| `--parallel` | Delegate independent owned work when supported and authorized |
| `--auto` | Continue all authorized phases without routine approval |
| `--no-test` | Skip test execution and report that verification gap |

`--tdd` preserves current behavior with tests before each refactoring phase.
`--advice` loads `references/advisory-supervision-checkpoints.md`; also honor an
accepted plan's advice handover or Failure Protocol. Its failed-verification counsel
checkpoint remains active in every mode. `--yagni` opts into scope cutting; otherwise
deliver all requested scope and nothing extra. Pass selected flags to delegates.

Parse detailed signals with `references/intent-detection.md` only when necessary.
For cross-skill sequence decisions use `references/workflow-routing.md`.

## Implement and finish

1. Reuse valid inspection and acceptance evidence. A small change needs a concise
   plan; write phase files when modules, public contracts, schemas or data require coordination.
2. Follow `references/workflow-steps.md` for implementation, TDD and finalization.
   Resolve existing plans files-first via `references/plan-state-files-first.md`.
3. Run the narrowest useful checks, then broaden for affected callers and contracts.
   Reuse results only for unchanged source, inputs and environment. Do not weaken checks.
4. Review acceptance, compatibility, security and regression risk. Use
   `references/review-cycle.md` and `references/required-subagents.md` to scale review.
5. Continue repairing within scope. Pause for a changed product decision, destructive
   action without authorization, or an evidenced blocker. Explicit interactive gates
   are in `references/blocking-gates.md`.
6. Reconcile existing plan state, update impacted docs, and report result, evidence and
   unresolved limitations. Commit/publish only within the user's authorized scope.

## Journal step — opt-out

Skip the automatic `/aif-journal` step when either applies:
- The invocation includes the `--skip-journal` flag, OR
- `node <aif-plan>/scripts/prefs.cjs get journal.auto` prints `false` (`<aif-plan>` means the installed aif-plan skill directory, a sibling of this skill). If the command errors or prints anything other than the exact string `false`, treat as `true` (default) — corrupt or missing config never suppresses the automatic journal.

Precedence: flag > project config > user config > default (`true`).
When skipped, print one line:
- `journal skipped by --skip-journal` (flag), or
- `journal skipped by preference` (config).

Explicit `/aif-journal` and `node <aif-journal>/scripts/journal.cjs create` (`<aif-journal>` is the sibling aif-journal skill directory) are unaffected. The opt-out covers the journal step only; the rest of the Finalize block still runs.
