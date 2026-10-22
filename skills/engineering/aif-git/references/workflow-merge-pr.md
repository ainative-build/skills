# Merge PR Workflow (`merge-pr`)

Merge a GitHub pull request via `gh`, then watch post-merge CI on the target branch until green and verify the result before stopping.

## Variables

- PR_REF: PR number or URL (required)
- MERGE_METHOD: repo convention (`--squash`, `--rebase`, or default merge commit)
- TO_BRANCH: target branch (`baseRefName` from Step 1)

## GitHub API compatibility

Every bash block in this workflow that reads or writes PR state MUST source the bundled compatibility helper `<aif-git>/scripts/gh-api-helpers.sh` first — it probes the GitHub GraphQL API once and provides REST fallbacks for environments (notably Claude Cloud Environment) that block GraphQL at the egress proxy. Native `gh pr view / checks / merge / list` all issue GraphQL and 403 in that environment.

```bash
. "<aif-git>/scripts/gh-api-helpers.sh"
read OWNER REPO NUMBER < <(_aif_split_pr "$PR_REF")
```

`_aif_pr_meta` / `_aif_pr_checks` mirror the native `gh pr view --json …` / `gh pr checks` outputs and branch on `AIF_GH_REST` internally. For the merge write there is no REST auto-merge endpoint — GitHub's `enablePullRequestAutoMerge` is GraphQL-only — so when `AIF_GH_REST=1` this workflow degrades from "merge with `--auto` while checks pending" to "poll checks until terminal-green, then `PUT /pulls/{n}/merge`" (see Step 3).

## Step 1: Pre-merge readiness gate

All checks must pass before merging. On any failure, STOP and report — never merge past a red gate.

```bash
_aif_pr_meta   "$OWNER" "$REPO" "$NUMBER"
_aif_pr_checks "$OWNER" "$REPO" "$NUMBER"
```

REST `_aif_pr_meta` returns snake_case fields (`base.ref`, `head.ref`, `mergeable`, `mergeable_state`) instead of the native camelCase (`baseRefName`, `headRefName`, `mergeStateStatus`); parse accordingly when `AIF_GH_REST=1`. REST `mergeable` may be `null` while GitHub computes it asynchronously — re-fetch once (with a short sleep) before treating `null` as a blocker. `reviewDecision` is not in the REST pulls payload; when needed, read the latest review event from `gh api "repos/$OWNER/$REPO/pulls/$NUMBER/reviews" --jq '.[-1].state'`.

Gate conditions:

| Check | Requirement |
|-------|-------------|
| `state` | `OPEN` |
| `mergeable` | `MERGEABLE` (no conflicts) |
| CI checks | All passing, or only pending (pending → use `--auto`) |
| `reviewDecision` | Not `CHANGES_REQUESTED` |
| Branch | Never merge into a branch the repo forbids; respect branch protection |

If any check fails deterministically (red CI, conflicts), report the blocker instead of merging.

## Step 2: Pick merge method

Follow repository convention, in priority order:

1. Method documented in the project's `CLAUDE.md` / `CONTRIBUTING.md`.
2. Method used by recent merged PRs. When `AIF_GH_REST=0`, `gh pr list --state merged --limit 5 --json mergedAt,number` and inspect. When `AIF_GH_REST=1` fall back to REST: `gh api "repos/$OWNER/$REPO/pulls?state=closed&per_page=5" --jq '.[] | select(.merged_at) | {number, merged_at}'`.
3. Repo settings: if only one method is allowed, the merge call fails with a clear error — retry with the allowed method.
4. Default: merge commit.

## Step 3: Merge

**Native path (`AIF_GH_REST=0`)** — GitHub GraphQL available; `gh pr merge --auto` is the preferred pending-checks flow:

```bash
# All checks green:
gh pr merge "$PR_REF" {MERGE_METHOD}

# Required checks still pending:
gh pr merge "$PR_REF" {MERGE_METHOD} --auto
```

**REST path (`AIF_GH_REST=1`)** — no auto-merge REST endpoint exists. Poll checks to terminal-green first, then `PUT /pulls/{n}/merge`. The poll is bounded: a `"No checks found"` response is retried once (guards against `_aif_pr_checks`' swallowed API errors) then treated as terminal and refused rather than merged blind, and the pending-poll loop is capped at `MAX_ITERS=60` (30 min) — the same stall budget documented below for the native path — instead of spinning indefinitely:

```bash
# Map MERGE_METHOD to REST payload:
#   --squash  -> squash
#   --rebase  -> rebase
#   (default) -> merge
REST_METHOD=merge   # override to squash/rebase per convention

# Poll checks — stop when every check_run's status is 'completed'.
# Bounded: 60 x 30s = 30 min, matching the stall budget this workflow already
# documents in prose for the native --auto path (see rules below and the
# Error Handling table's "CI stuck pending > 30 min" row).
MAX_ITERS=60
no_checks_retried=0
_aif_iter=0
while :; do
  checks="$(_aif_pr_checks "$OWNER" "$REPO" "$NUMBER")"
  # _aif_pr_checks swallows API errors (2>/dev/null) internally, so a lone
  # "No checks found" is indistinguishable from a transient failure — retry
  # once before treating it as terminal, same precedent as the `mergeable:
  # null` re-fetch in Step 1 above.
  if [ -z "$checks" ] || [ "$checks" = "No checks found" ]; then
    if [ "$no_checks_retried" -eq 0 ]; then
      no_checks_retried=1
      sleep 5
      continue
    fi
    echo "REST merge blocked: no check-runs reported for this commit after retry — repo may have no CI configured, may use legacy commit statuses (unsupported by this path), or the checks API call failed. Verify manually before merging." >&2
    exit 1
  fi
  no_checks_retried=0   # good snapshot — restore the retry budget for the next blip
  pending="$(printf '%s\n' "$checks" | awk -F'\t' '$2 != "completed"' | wc -l)"
  [ "$pending" -eq 0 ] && break
  _aif_iter=$((_aif_iter + 1))
  if [ "$_aif_iter" -ge "$MAX_ITERS" ]; then
    echo "REST merge blocked: checks still pending after ${MAX_ITERS} polls (~30 min) — stall, not spinning further. Last observed checks:" >&2
    printf '%s\n' "$checks" >&2
    exit 1
  fi
  sleep 30
done

# Refuse if any check concluded non-success. Reuses the loop's final
# snapshot instead of re-querying (avoids a second round trip and a
# same-instant race where checks could change between two separate calls).
failed="$(printf '%s\n' "$checks" | awk -F'\t' '$3 != "success" && $3 != "neutral" && $3 != "skipped"' | wc -l)"
[ "$failed" -eq 0 ] || { echo "REST merge blocked: $failed check(s) not green" >&2; exit 1; }

# Merge:
gh api -X PUT "repos/$OWNER/$REPO/pulls/$NUMBER/merge" -f "merge_method=$REST_METHOD"
```

Rules (apply to both paths):
- Never force push. Never direct-push to protected target branches.
- Do not pass `--delete-branch` (or REST `delete_branch=true`) unless the repo convention deletes head branches.
- With native `--auto`, poll until the PR actually merges before moving to Step 4:

```bash
# Native
gh pr view "$PR_REF" --json state,mergedAt   # repeat with sleep 30 until state == MERGED
# REST equivalent
gh api "repos/$OWNER/$REPO/pulls/$NUMBER" --jq '{state, merged_at}'
```

If auto-merge waits on a check that never completes (stuck > 30 min), report the stall as a blocker.

## Step 4: Watch post-merge CI

Run only after Step 3 confirms `state == MERGED` — before that, the merge commit SHA is empty and `gh run list --commit ""` silently returns nothing. Watch the target-branch workflows triggered by the merge commit:

```bash
# Native (AIF_GH_REST=0):
MERGE_SHA=$(gh pr view "$PR_REF" --json mergeCommit -q .mergeCommit.oid)
# REST (AIF_GH_REST=1):
MERGE_SHA=$(gh api "repos/$OWNER/$REPO/pulls/$NUMBER" --jq .merge_commit_sha)

# `gh run list/watch` uses REST already — no fallback needed.
gh run list --branch {TO_BRANCH} --commit "$MERGE_SHA" --json databaseId,name,status,conclusion
gh run watch <run-id> --exit-status
```

Repeat until every run for the merge commit concludes. `sleep 30` between polls if `gh run watch` is unavailable.

## Step 5: Handle CI failure

If a post-merge run fails with a deterministic, repo-fixable error:

1. Inspect logs: `gh run view <run-id> --log-failed`.
2. Create a follow-up fix branch from the target branch (never fix on the merged head branch).
3. Activate `aif-fix --auto` with the exact failing command and error evidence.
4. Ship the fix through the repo's normal PR flow, merge it with this same workflow, and watch again.

Stop conditions — stop and report when any of:
- target-branch CI is green (success)
- the failure is an external blocker (infra outage, missing secret, flaky third-party)
- the same failure survives 3 fix attempts (not converging)

## Step 6: Verify follow-up

Before declaring done:

- Confirm PR state is `MERGED` and the merge commit exists on the target branch:
  `git fetch origin && git log origin/{TO_BRANCH} --oneline -5`
- Confirm all CI runs for the merge commit concluded `success`.
- If the repo has post-merge automation (release tagging, deploy workflows), confirm those runs also succeeded or are intentionally out of scope.
- **Close a plan-backed change's index row.** Match this merged PR to a plan by
  its recorded `--linked-pr`, or by plan branch == the PR head branch
  (`node <aif-plan>/scripts/plan.cjs list --json` — post-merge you are on the
  target branch, so `resolve`, scoped to the current branch, will not find the
  head-branch plan). On a unique match, `node <aif-plan>/scripts/plan.cjs close
  <plan-dir>` — a state-only transition in `$AIF_HOME/plans-state.json` (default `~/.aif`); the plan
  files already carry `status: completed` from the ship commit. A match miss means the plan is already closed or there is no
  plan — skip silently; on ambiguity, skip and report. Optionally append (never
  edit) a completion comment to a linked issue per the "Delivery finalization"
  section of `../../aif-serve/references/plan-state-files-first.md`.
  Never delete or hand-edit plan files.
- Report: PR URL, merge commit SHA, merge method, CI runs watched and their conclusions, follow-up fixes shipped (if any).

## Error Handling

| Error | Action |
|-------|--------|
| Merge conflicts (`CONFLICTING`) | Report; suggest updating the head branch, do not resolve on the target branch |
| Branch protection blocks merge | Report required approvals/checks; never bypass |
| `gh` not authenticated | Report; suggest `gh auth login` |
| Self-merge forbidden by repo policy | Report; hand off to a human maintainer |
| CI stuck pending > 30 min | Report stall with run URL |
