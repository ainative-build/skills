# Investigation Progress Coordination

Debugging must remain usable without a particular client's task API. Discover
the live task-management surface at runtime. Use it when available; otherwise
update the active plan. Plan files are the durable source of truth.

## When Tracking Helps

Use explicit tracking for investigations with at least three meaningful steps,
parallel evidence collection, multiple components, or repeated verify loops.
Skip it for a short linear diagnosis.

## Investigation Pipeline

Preserve this dependency order:

1. Assess incident scope and capture the failing state.
2. Collect logs, traces, tests, and relevant code evidence.
3. Analyze the evidence and prove the root cause.
4. Implement the smallest cause-aligned fix.
5. Reproduce the original path and verify the blast radius.

When the live surface supports dependencies and ownership, mirror the pipeline
there. Otherwise, represent the same states and prerequisites in the active
plan. Never block diagnosis because runtime tracking is absent.

## Parallel Evidence Collection

- Split independent sources such as CI logs, application logs, database state,
  and code paths.
- Assign non-overlapping scopes before dispatch.
- Join all evidence before declaring a root cause.
- Keep durable evidence in the investigation report or active plan.

## Failed Fix Cycles

When verification fails, return to evidence analysis and record a new attempt.
Preserve prior evidence and the reason each hypothesis failed. After three
failed cycles, stop and ask the user to reassess the architecture or scope.

## Sync-Back

Before completion, reconcile finished investigation work with the active plan,
update affected checkboxes and status, and list unresolved mappings or risks.
