# Workflow Routing

Use this file when choosing the sequence for multi-step work. It is a routing
map only; load the owning `SKILL.md` before executing details.

## Core Sequences

| User intent | Sequence |
|---|---|
| Implement a feature | `/aif-brainstorm` -> `/aif-plan` -> `/aif-serve` -> `/aif-test` -> `/aif-code-review` |
| Execute an accepted plan | reuse its brainstorm contract -> `/aif-serve <plan-path>` |
| Quick implementation | bounded brainstorm gate -> `/aif-serve --fast` |
| Bug, error, failed test, or CI failure | opening intent frame -> `/aif-fix` |
| Investigate before deciding | `/aif-recon` -> `/aif-debug` -> `/aif-brainstorm` -> `/aif-plan` |
| Review a PR | `/aif-code-review <PR>` |
| Fix review feedback | `/aif-fix --parallel` |
| Ship a completed branch | `/aif-ship` |

## Implementation Owner

- Start delivery with outcome, constraints, non-goals, and acceptance criteria.
  Reuse them from an accepted plan instead of asking again.
- Use `/aif-serve` for known feature scope after requirements are clear.
- Use `/aif-fix` for concrete bugs, errors, test failures, and CI failures.
- Use `/aif-plan` when work needs architecture, phases, file ownership, or a
  test matrix.
- Use `/aif-test` for verification-only work.
- Use `/aif-ship` only after implementation, tests, and review are done.
- Read-only scout, debug, review, and explanation work may stop without an
  interactive design loop. Satisfy the brainstorm gate if it crosses into
  delivery or workspace mutation.

## Handoff Rules

- Establish the brainstorm contract, then gather evidence and design, followed
  by the workflow owner (`/aif-plan`, then `/aif-serve`).
- For documentation changes, delegate to the `aif-docs-manager` agent for the
  affected docs only.
- When skill choice is ambiguous, use the installed skill names and descriptions.

## Post-Implementation

- Review high-risk, cross-module, or public-contract changes before shipping.
- Update docs only when behavior, setup, commands, architecture, security
  posture, public contracts, or future maintainer decisions changed.
- Journal when a workflow creates durable decisions or debugging lessons.
