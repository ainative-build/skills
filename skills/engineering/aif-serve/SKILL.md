---
name: aif-serve
description: "Implement features, plans and fixes through a structured workflow."
when_to_use: "Invoke to implement known scope after requirements are clear."
category: workflow
keywords: [implementation, workflow, feature, pipeline]
argument-hint: "[task|plan-path] [--interactive|--fast|--parallel|--auto|--no-test] [--chef] [--yagni]"
license: MIT
metadata:
  author: ainative-build
  version: "2.6.0"
  workflow:
    follows: [aif-plan]
    precedes: [aif-test]
---

# Serve

Invoke `/aif-serve <task|plan-path> [flags]`, in the runtime's installed command form (the
README lists each runtime's form).

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
| `--no-test` | Skip test-first design and test execution; report that verification gap |

`--chef` loads `references/advisory-supervision-checkpoints.md`; also honor an
accepted plan's `--chef` handover or Failure Protocol. Its failed-verification counsel
checkpoint remains active in every mode. `--yagni` opts into scope cutting; otherwise
deliver all requested scope and nothing extra. Pass selected flags to delegates.

Parse detailed signals with `references/intent-detection.md` only when necessary.
For cross-skill sequence decisions use `references/workflow-routing.md`.

## Test first, then implement

Test-first is the default in every mode except `--no-test`. For each phase, before writing
production code:

1. Invoke the `aif-test` skill as `/aif-test create <phase file or task>`. It writes the phase's
   Tests First tests, or, without a plan, tests derived from the task's acceptance criteria.
   It also writes signature-only stubs for new modules so the tests fail on assertions.
   Do not write these tests or stubs inline in serve; the test skill owns both.
2. Run them and confirm they are red for the stated reason: new-behavior tests fail on an
   assertion about the missing behavior, and characterization tests pass.
3. Implement until they are green, then refactor with them kept green.

A phase marked `Tests First: not applicable` skips steps 1–2 and says so in the report.
Details are in `references/workflow-steps.md`.

## Implement and finish

1. Reuse valid inspection and acceptance evidence. A small change needs a concise
   plan; write phase files when modules, public contracts, schemas or data require coordination.
2. Follow `references/workflow-steps.md` for test-first implementation and finalization.
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
