# Primary Workflow

Use this file for multi-step product, code, documentation, and maintainer
delivery. Direct answers and low-level read-only utilities may stay direct.

## 1. Brainstorm the outcome

- Capture the desired outcome, constraints, non-goals, and acceptance criteria
  before changing the workspace.
- Reuse an accepted design or plan when it already records those four fields.
- Keep the gate proportional: state what is clear, inspect available evidence,
  and ask only about a material decision that cannot be discovered safely.
- For a bug, frame the expected repaired behavior and safety boundary now. Scout
  and diagnose the cause before comparing solution options.

## 2. Inspect

- Read the request, relevant docs, nearby code, and tests before planning.
- Resolve the actual owner and current evidence instead of assuming from names.
- Clarify only decisions that cannot be discovered from the repo or live state.
- For broad or risky work, create or update a plan in `plans/`.
- For ambiguous workflow sequence, load the `aif-cook` skill's
  `references/workflow-routing.md`.

## 3. Plan and implement

- Change existing files when that matches the design; create new files only for real boundaries.
- Keep behavior compatible unless the accepted scope says otherwise.
- Prefer local helpers, conventions, and test utilities over new abstractions.
- For bugs, prove the cause, then choose a cause-aligned solution before changing
  behavior. Invoke `/aif-brainstorm` when multiple viable fixes or an
  architecture decision remain.

## 4. Verify

- Run focused tests for touched behavior.
- Broaden to lint, typecheck, build, or integration tests when shared contracts changed.
- Fix regressions instead of weakening tests.

## 5. Review and finish

- Use `/aif-code-review` or the `aif-code-reviewer` agent for high-risk, cross-module, or public-contract changes.
- Update docs only when user-facing behavior, workflows, commands, or architecture changed.
- Explain the result plainly. Add an inline Mermaid diagram only when a visual
  materially improves a complex workflow or architecture explanation.
- Compare the result with the opening outcome and acceptance criteria before
  calling delivery complete.
