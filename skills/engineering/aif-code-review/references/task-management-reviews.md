# Review Progress Coordination

Review quality does not depend on a particular task API. Discover the live
task-management surface at runtime. Use it when available; otherwise update the
active plan directly. Plan files are the durable source of truth.

## When Tracking Helps

| Review scope | Track separately? | Reason |
|--------------|-------------------|--------|
| Single-file fix | No | Run scout, review, and verification directly |
| Multi-file feature | Yes | Preserve the scout → review → fix → verify chain |
| Parallel reviewer scopes | Yes | Record ownership and join points |
| Critical fix cycle | Yes | Keep each re-review tied to its prerequisite fix |

Skip runtime tracking for fewer than three meaningful steps.

## Pipeline

Use this dependency order:

1. Scout edge cases.
2. Review the implementation after scouting completes.
3. Fix accepted Critical and Important findings after review.
4. Verify the fixes with fresh evidence.

Record pending, active, blocked, and completed states through the live surface
when it supports them. If it does not, use checklist state in the active plan
and advance only after each prerequisite is complete.

## Parallel Reviews

- Split only independent file or subsystem scopes.
- Record one owner per scope before dispatch.
- Join all reviewer results before starting the shared fix step.
- Keep reviewer findings in reports or the plan, not only in session state.

## Re-Review Cycles

If fixes introduce new issues, append another review cycle after the fix and
verification work. Limit the loop to three cycles, then ask the user how to
proceed.

## Sync-Back

Before claiming completion:

1. Reconcile finished review work with the active plan.
2. Update all affected phase checkboxes, including stale earlier phases.
3. Record unresolved findings and mappings.
4. Treat runtime state as disposable once the plan is current.
