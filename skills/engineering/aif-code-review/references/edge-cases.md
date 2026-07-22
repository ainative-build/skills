# Edge-case probing

Applies to every axis. Reviews catch the obvious path and miss the subtle side effect. Before
signing off on any changed function, enumerate its edge cases and check each against the code — then
verify the ones you can (the reviewer has Bash; run a quick repro).

## Enumerate, per changed function

- **Empty / null / undefined** — empty array/string/map, null arg, missing object field.
- **Boundary** — zero, one, max, off-by-one, first/last element, overflow.
- **Ordering** — "A always called before B" — find the out-of-order path.
- **Error paths** — what happens on a thrown/rejected call mid-operation; is it caught or does it escape.
- **Partial failure** — a multi-step op that fails halfway (no rollback → corrupt state).
- **Concurrency** — two callers at once on shared state; cache invalidation during a write.
- **External assumptions** — "the API always returns 200", "this env var exists", "this list is non-empty".

## Trace the blast radius (use the context pack / aif-recon)

- Which files import/depend on the changed symbols? Do their assumptions still hold?
- Does a changed data-flow break a caller not in the diff?
- Is a shared utility changed but only one caller tested?

## Verify, don't assume

For each material edge case, prefer a real check over a claim:

```
# reproduce the empty/boundary case directly
node -e '...'          # or the project's runtime
<project test command> # run the covering test; read pass/fail
grep -rn '<symbol>('   # confirm callers and their assumptions
```

Tag each edge-case finding `[Verified]` (you ran it, include command + output) or `[Reasoned]`
(argued from the code). An edge case you assert without either evidence gets dropped — no vibes.

## High-signal red flags

- Shared utility changed, only one caller tested.
- Error path leads to an unhandled rejection.
- State mutated in place with no notification to dependents.
- Breaking change with no migration.
