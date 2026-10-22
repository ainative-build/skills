# Merge Workflow

## Step 13: Merge (if `--merge`)

Skip this step in a batch-landing repository (see "Batch-landing
repositories" in the skill): the repository's landing owner merges, so report
`Merge=delegated` and stop.

Run only when `--merge` is present and after Step 12 created or updated a PR,
its body passed the section check, and Step 12b completed or explicitly skipped
without a plan. Capture one concrete PR URL or number as `PR_REF`; missing or
ambiguous PR state is a blocker.

When `--advice` was passed, run the pre-merge Oracle checkpoint from
`SKILL.md` first.

Run the `aif-git` merge-pr workflow (`<aif-git>/references/workflow-merge-pr.md`)
exactly once on `PR_REF`. It owns the readiness gate (open, mergeable, CI green
or pending, no `CHANGES_REQUESTED`, branch protection), the merge method, the
merge itself, post-merge CI convergence, and closing a linked plan. Do not
reimplement or bypass those gates.

Interpret its result fail-closed. Claim a successful merge only when the PR
reports `Merge=merged` and post-merge `CI=green`. For a refused gate, red,
pending, unavailable, or missing evidence, stop the ship path, report the exact
reason, and do not claim completion.
