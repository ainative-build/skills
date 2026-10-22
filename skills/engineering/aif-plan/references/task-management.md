# Task Management Integration

Plan files are the durable source of truth. A runtime task view is an optional,
session-scoped projection that can improve visibility and coordination without
becoming a dependency.

## Runtime Capability Contract

1. Discover the live task-management surface at runtime.
2. If available, mirror actionable plan items, dependencies, ownership, and status.
3. If unavailable, update the active plan directly.
4. Never infer support from a client name, environment, or cached tool list.
5. Sync completed work back to plan files before claiming completion.

## When to Hydrate

Hydrate by default after writing a plan with at least three meaningful phases.
Skip when `--no-tasks` is requested or when the plan is too small to benefit.

For an HTML-authoritative plan, hydrate only from a companion Markdown index
that contains actionable checkboxes. Otherwise, leave runtime tracking empty.

## Hydration

1. Read `plan.md` and every `phase-XX-*.md` file.
2. Treat checked items as complete and unchecked items as remaining work.
3. Discover the live task-management surface.
4. If available, mirror remaining work and preserve phase dependencies.
5. Retain enough context to map each runtime item back to its phase file and checklist item.
6. If no live surface exists, keep status current in the plan files.

## Cook Handoff

In the same session, Cook may reuse the live view after confirming it matches
the plan. In a new session, or when the view is absent or stale, Cook rebuilds
it from unchecked plan items. The plan always wins when states disagree.

## Sync-Back

1. Sweep every phase file, not only the active phase.
2. Reconcile completed runtime work with source checklist items.
3. Backfill stale completed checkboxes in earlier phases.
4. Derive plan status and progress from actual checkbox state.
5. Report any item that cannot be mapped before claiming full completion.

## Quality Checks

- No dependency cycles.
- Every runtime item maps to durable plan work.
- Runtime ownership does not overlap.
- Checked items have completion evidence.
- Runtime counts are advisory; plan checkbox state determines durable progress.
