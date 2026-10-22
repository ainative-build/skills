# Dual-Target Ship (`--both`) — Stage Sequencing

`--both` runs the ship pipeline against both targets in strict sequence: the
beta stage first, then a gated stable stage. It never runs the two stages in
parallel and never starts the stable stage on an unproven beta result.

## Flag semantics

- `--both` supersedes a positional mode token (`official`, `beta`, aliases).
  If a token is also present, warn once ("--both supersedes <token>") and
  continue in dual-target mode. Never silently drop either input.
- Composes with `--advice`, `--merge`, and the skip flags. Each
  stage applies the composed flags with its own canonical mode semantics
  (beta stage skips docs update; stable stage runs the full official pipeline).
- `--dry-run` simulates the beta stage only and reports the stable stage as
  `not-simulated` — a dry-run cannot know the beta merge outcome the stable
  stage is gated on.

## Stage 1: beta stage

1. Run the standard pipeline (`ship-workflow.md` Steps 1-12b) with canonical
   mode `beta` (target = detected dev/beta/develop branch).
2. If `--merge`: run Step 13 (load `merge-workflow.md`) and converge
   the beta PR to `Merge=merged`, `CI=green`.
3. Record the beta PR URL; it appears in the final output regardless of how far
   the stable stage proceeds.

## Stable stage gate

Do not start the stable stage until:

- the beta PR exists, and
- when `--merge` was requested: only after beta CI is green for the beta merge
  commit on the target branch. A red, pending, cancelled, or unknown beta CI
  state blocks the stable stage; report the blocker instead of proceeding.

In a batch-landing repository, the beta stage ends at an open ready PR that
the landing owner merges later, so treat it as if `--merge` were absent: with a
promotion convention, report the stable stage as `pending beta merge`.

Without `--merge`, detect the repository's stable-delivery convention:

- **Promotion convention** (stable receives dev/beta promotions, not feature
  PRs): stop after the beta stage and report the stable stage as
  `pending beta merge` — the promotion path needs the beta merge to exist
  first. Do not open a promotion PR from an unmerged feature branch.
- **Direct-PR convention** (stable accepts feature PRs directly): proceed to
  the stable stage from the same branch.

## Stage 2: stable stage

Pick the path from how stable normally receives changes:

1. **Promotion convention** (e.g. release PR from dev into main): follow that
   convention. Before merging a promotion PR, list the commits it carries
   (`git log <stable>..<dev> --oneline` or the PR commit list). If it
   sweeps unrelated work beyond this ship, stop and ask the user before
   merging — never merge a sweeping promotion silently.
2. **Direct-PR convention**: run the standard pipeline again with canonical
   mode `official` (target = detected default branch) from the same feature
   branch — Steps 1-12b, then Step 13 when `--merge` is present.

Stage-2 merges go through the same Step 13 merge flow as any other
`--merge` ship; this reference adds no separate merge mechanism and no
alternative to branch protection.

## Completion contract

The dual-target ship is complete only when:

- beta PR created (and, with `--merge`, merged with green target CI), and
- stable stage either completed the same way, or is explicitly reported as
  `pending beta merge` / blocked with the exact reason.

Output both stages explicitly:

```
✓ Beta PR:   <url> (merged/green | open | blocked: <reason>)
✓ Stable:    <url> (merged/green | open | pending beta merge | blocked: <reason>)
```

## Hard rules

- Never force-push; never direct-push a protected target branch.
- Never bypass branch protection, required checks, or the Step 13
  merge-readiness gate in either stage.
- Never merge a promotion PR that sweeps unrelated work without asking.
- A failed or blocked beta stage always ends the run with the stable stage
  reported as skipped — never attempt stable delivery around a broken beta.
