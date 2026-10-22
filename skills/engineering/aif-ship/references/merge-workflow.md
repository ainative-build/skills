# Merge Workflow

## Step 12: Merge (if `--merge`)

Skip this step in a batch-landing repository (see "Batch-landing
repositories" in the skill): the repository's landing owner merges, so report
`Merge=delegated` and stop.

**Local ship (`LOCAL=1`):** there is no PR or CI. Without `--merge`, stop after Step 11.
With `--merge`, merge into the target locally, test the merged result before committing it,
and close the plan:

1. Stop if the working tree has uncommitted changes that would follow you onto `<target>`;
   report them instead of carrying unrelated files across.
2. Merge without committing, test, then commit or abort:
   ```bash
   git switch <target>
   git merge --no-ff --no-commit <branch>
   <test command from Step 4>
   git commit --no-edit          # tests passed
   git merge --abort             # tests failed: <target> is unchanged; report and stop
   ```
   On a conflict, run `git merge --abort` and report the conflicting files.
3. If Step 8b finalized a plan, close it: `node <aif-plan>/scripts/plan.cjs close <plan-dir>`.
4. Report `Merge=merged (local)` and `CI=n/a`. Never push, add a remote, or delete the branch.

The rest of this step applies only when `LOCAL=0`.

Run only when `--merge` is present and after Step 11 created or updated a PR,
its body passed the section check, and Step 11b completed or explicitly skipped
without a plan. Capture one concrete PR URL or number as `PR_REF`; missing or
ambiguous PR state is a blocker.

When `--chef` was passed, run the pre-merge Chef checkpoint from
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
