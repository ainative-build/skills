# Coding Taste — the reasoning protocol applied to complex code changes

Fable Thinking's moves, applied to code. Fable 5.1's edge in this domain is not typing
speed: it names the root cause of a broken build before touching it, implements a design
with the smallest complete change, writes tests that discriminate, and verifies on the
final tree. Smaller models patch where the error surfaces, rewrite whole files to change
three lines, sprawl near-duplicate tests, and report green without running anything. This
reference makes the disciplined path mechanical.

## When to load this reference

Load BEFORE the first edit for any change beyond a trivial rename: bug fix, feature,
refactor, migration, build or CI failure, dependency upgrade, or review of a non-trivial
diff. The trigger is the deliverable type (a code change), not the word "code" in the ask.

## Know Your Own Defaults (coding failure modes)

- **Symptom patching** — fixing where the error appears instead of where the invariant is
  established. The bug moves.
- **Whole-file rewrites** — regenerating a file to change a few lines; unrelated edits are
  lost, subtle drift enters, and the reviewer cannot see the change.
- **Speculative generality** — abstractions, options, flags, and config nobody asked for.
- **Defensive noise** — exception handlers that swallow, null checks on impossible paths,
  fallbacks that hide the bug and corrupt state further downstream.
- **Test theater** — tests that assert the mock, tests written afterwards to match whatever
  the code does, three near-identical tests instead of one discriminating one, or a
  failing test weakened until it passes.
- **Green by assertion** — "tests should pass" without running them; running a subset and
  reporting the suite.
- **Refactor drift** — renames and style changes mixed into a fix; the fix disappears in
  the diff.
- **Contract amnesia** — a public signature, flag, schema, or format changed without
  finding every caller, doc, and fixture that depends on it.

## How to think (the moves, in coding order)

Deeper playbooks: the full investigation (reproduction, differential diagnosis, root
cause, prevention) is `references/debugging-root-cause.md`; the standards a change is
judged against are `references/engineering-standards.md`; choosing between designs is
`references/solution-exploration.md`.

1. **FRAME.** Deliverable and scope line. Name the contract touched (public API, CLI flag,
   schema, file format, event shape) and the invariant that must survive. A question about
   a bug wants a diagnosis; a fix is a separate deliverable.
2. **GROUND — locate the owner.** Read the error literally (exact text, exact line, actual
   values). Follow it to the module that establishes the broken invariant; that module owns
   the fix. Read its contract, its tests, and its history (why is it this way?) before
   editing anything.
3. **Reproduce before fixing.** A failing test, a command, a minimal input. If it cannot be
   reproduced, say so and fix only with a mechanism you can state end to end.
4. **Diagnose with two hypotheses.** Choose the check that splits them, not the one that
   confirms the favorite. Demand the mechanism chain from cause to symptom; a gap in the
   chain is an assumption. Every broken build has a cause you can name — name it first.
5. **Choose the altitude and the smallest complete fix.** Write the invariant ledger:
   preserves, breaks (deliberately, with migration), risks. Prefer existing utilities and
   module boundaries. If the fault is design-level, say so and propose; do not patch it at
   line level.
6. **Simulate before writing.** Trace the new path with concrete inputs: empty, one,
   typical, boundary, huge, malformed, concurrent, unicode. Walk the error paths too.
7. **Edit surgically, in buildable order.** Targeted edits, never regeneration. Types →
   implementation → callers → tests → docs. Register new artifacts wherever their siblings
   are registered (routes, manifests, shard lists, parity files, exports).
8. **Tests as discriminators.** When feasible, write the test that fails for the right
   reason first. One test per behavior; assert behavior, not implementation. Never weaken
   an existing test to pass — diagnose why it fails.
9. **Verify as a loop.** Typecheck, lint, narrowest tests → owning package → integration
   when a shared contract changed. Re-run on the final tree after the last edit. Read your
   own diff as the reviewer who wants to reject it.
10. **Deliver.** What changed and why (the mechanism), how it was verified (exact commands
    and results), risks, and what is not done.

## What a good code change is (evaluable, not vibes)

- **Cause named and demonstrated** — the reproduction fails before and passes after.
- **Minimal** — the diff holds only the fix, its tests, and its docs.
- **Local** — the change lives in the owning module; callers change only when the contract
  intentionally changed.
- **Covered** — a test that would have caught the bug now exists and runs in CI.
- **Verified on the final tree** — commands and results reported, not implied.
- **Contract-safe** — public surfaces unchanged, or versioned and migrated with callers,
  docs, schemas, and fixtures updated in the same change.

## What to avoid (the code slop catalog — matches are failed gates)

- Catch-all exception handlers that log and continue on corrupted state.
- Comments narrating the code, referencing plan or finding IDs, or left stale after edits.
- A third copy of a helper that already exists twice.
- Config flags, environment variables, or options added for a single call site.
- Renames "for clarity" and import reordering mixed into a fix.
- Mocks that replace the thing under test; tests that only exercise the mock.
- Sleep-based synchronization in tests; retries that hide races.
- Hardcoded paths, secrets, or machine-specific state in code or fixtures.
- "TODO: handle error" on a shipped path.

## Details models habitually miss

- Read the first error and the last: the origin is usually first, and the last shows how
  far the cascade went. Do not fix a consequence.
- CI differs from your machine: time zone (UTC), locale, path separators, case sensitivity,
  line endings, available binaries. A test that passes locally and fails in CI is telling
  you which assumption you made.
- Tests that pass alone and fail in parallel: shared state, fixed ports, temp paths,
  ordering assumptions.
- Generated artifacts that must be regenerated and committed: bundles, snapshots,
  lockfiles, schemas, docs built from source.
- Migrations need schema, data, and rollback; a backup before any destructive step.
- Encoding: UTF-8 assumptions, BOMs, normalization; diacritics in fixtures.
- Resource cleanup: files, processes, ports, temp directories, connections in tests.
- Visual output: when the code produces something a human looks at, render and look
  (`references/design-taste.md`).
- The runtime the user actually runs, not the version in your prior.

## Verify (the loop)

1. Compile, typecheck, lint the touched files.
2. Run the reproduction: fails before, passes after.
3. Run the narrowest tests, then the owning package. Search the whole module's tests for
   the changed symbol: importer tests drift silently when a contract moves.
4. Broaden (integration, full suite) when a shared contract changed.
5. Re-run on the final tree after the last edit — not the second-to-last.
6. Diff review as reviewer: every hunk earns its place; no unrelated churn.
7. Negative-space scan: test for the new path, docs for the contract change, migration,
   registration, cleanup.
8. If the harness cannot run something, say exactly what was not run.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Cause | mechanism chain stated; repro fails before, passes after | repro run |
| Minimality | diff holds only fix, tests, docs | diff review |
| Locality | change in the owning module | owner trace |
| Coverage | a discriminating test exists and runs | test run |
| Verification | checks ran on the final tree | command log |
| Contract | callers, docs, schemas, fixtures consistent | search for the symbol |

## Do / Don't

| Don't | Instead |
|-------|---------|
| Fix where the error appears | Trace to the module that owns the invariant |
| Regenerate the file | Make targeted edits; keep unrelated lines untouched |
| Add a try/except to make it stop failing | Name the cause; fix it; let real errors surface |
| Write tests after, matching current output | Write the test that fails for the right reason first |
| Weaken the failing test | Diagnose why it fails; fix code or fix an invalid test with a reason |
| Mix renames and formatting into a fix | Separate change, or none |
| Claim green from the last partial run | Re-run on the final tree; report commands and results |
| Change a public contract quietly | Version it; update callers, docs, schemas, fixtures together |
