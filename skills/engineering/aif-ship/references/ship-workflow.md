# Ship Workflow — Detailed Steps

## Step 1: Pre-flight

1. Check current branch: `git branch --show-current`
   - If on target branch (main/master/dev): **ABORT** — "Ship from a feature branch, not the target branch."
2. Strip recognized flags (including `--both`), then normalize at most one positional mode token:
   - If `--both` was stripped: load `dual-stage-workflow.md` and run the dual-target
     sequence — it supersedes any positional mode token (warn once when both appear).
   - `official`, `stable`, or `main` → canonical mode `official`
   - `beta`, `dev`, or `next` → canonical mode `beta`
   - No mode token → infer from branch name:
     - `feature/* hotfix/* bugfix/*` → official
     - `dev/* beta/* experiment/*` → beta
     - Unclear → `ask_user capability` with options: "Official (main)", "Beta (dev)"
   - Multiple mode tokens, an unknown non-flag token, or any unrecognized
     `--flag` left after stripping known flags → stop and ask; never silently
     choose a mode, ignore a typo, or reinterpret the token as a branch.
   - Aliases select the canonical mode only. `main` does not force a branch
     literally named `main`; `dev` does not force a branch literally named
     `dev`.
3. Detect a local ship. Set `LOCAL=1` when any of these holds, else `LOCAL=0`:
   ```bash
   [ -z "$(git remote)" ]                      # no remote
   gh auth status >/dev/null 2>&1 || echo nogh # gh missing or not signed in
   ```
   With `LOCAL=1`, print once: `Local ship: no remote or gh auth; skipping issues, fetch, push and PR`.
   A local ship never adds a remote, pushes, creates a repository, or calls `gh`.
4. Auto-detect target branch. With `LOCAL=1`, use local branches instead of `origin/*`:
   `main`, else `master` for official; the first of `dev`, `beta`, `develop` that exists for beta.
   With `LOCAL=0`:
   ```bash
   # For official: detect default branch
   git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
   # Fallback
   git rev-parse --verify origin/main 2>/dev/null && echo "main" || echo "master"

   # For beta: detect dev branch
   for b in dev beta develop; do
     git rev-parse --verify origin/$b 2>/dev/null && echo "$b" && break
   done
   ```
5. Run `git status` (never use `-uall`). Record task ownership and intended ship scope; preserve unrelated uncommitted changes.
6. Run `git diff <target>...HEAD --stat` and `git log <target>..HEAD --oneline` to understand what's being shipped.
7. If `--dry-run`: output what would happen at each step and stop here. Do not
   spawn `aif-chef`, merge, or perform any mutation.

8. If `--chef`, run the mandatory post-preflight Chef checkpoint from
   `SKILL.md` before Step 2 or any mutation. Pass the canonical mode, detected
   target, branch/diff summary, constraints, and the exact go/no-go question.

## Step 2: Link Issues

Find or create related GitHub issues for traceability.

**Skip if:** `LOCAL=1`. Print `– Issues: skipped (local ship)` and continue to Step 3.

1. Search for related open issues by keywords from branch name and commit messages:
   ```bash
   # Extract keywords from branch name
   BRANCH=$(git branch --show-current)
   KEYWORDS=$(echo "$BRANCH" | sed 's/[^a-zA-Z0-9]/ /g' | tr '[:upper:]' '[:lower:]')

   # Search existing issues
   gh issue list --state open --limit 10 --search "$KEYWORDS"
   ```

2. Also check if any issues are referenced in commit messages:
   ```bash
   git log <target>..HEAD --oneline | grep -oE '#[0-9]+' | sort -u
   ```

3. **If related issues found:** Note issue numbers for PR linking.

4. **If NO related issues found:** Create a new issue with structured format:
   ```bash
   gh issue create --title "<type>: <summary from commits>" --body "$(cat <<'EOF'
   ## Problem Statement
   <infer from diff and commit messages>

   ## Proposal
   <summarize the implementation approach>

   ## How It Works
   <describe key changes with bullet points>

   ### Architecture
   ```
   <ASCII diagram of component interactions>
   ```

   ## Challenges
   - <potential edge cases or risks>

   ## Plan & Phases
   - [x] Implementation complete
   - [x] Tests passing
   - [ ] Code review approved
   - [ ] Merged to <target>

   ## Human Review Tasks
   - [ ] Verify business logic correctness
   - [ ] Check for edge cases not covered by tests
   - [ ] Validate UX/API contract changes (if any)
   EOF
   )"
   ```

5. Store issue numbers for Step 11 (PR creation).

## Step 3: Merge target branch

Fetch and merge so tests run against the merged state:

```bash
git fetch origin <target> && git merge origin/<target> --no-edit   # LOCAL=0
git merge <target> --no-edit                                         # LOCAL=1: no fetch
```

- **If merge conflicts:** Try auto-resolve simple ones (lockfiles, version files). For complex conflicts, **STOP** and show them.
- **If already up to date:** Continue silently.

## Step 4: Run Tests

**Skip if:** `--skip-tests` flag.

1. Auto-detect test command (see `auto-detect.md`)
2. Delegate to `aif-tester` subagent — don't inline test execution
3. Check pass/fail from agent result

- **If a test fails:** Classify the cause. Repair branch-caused failures within scope, then rerun affected checks. Preserve evidence and stop publication for unresolved external blockers or scope-changing decisions; never weaken tests.
- **If all pass:** Note counts briefly and continue.
- **If no test runner detected:** Use `ask_user capability` — "No test runner detected. Skip tests or provide command?"

## Step 5: Pre-Landing Review

**Skip if:** `--skip-review` flag.

1. Get the full diff: `git diff origin/<target>` (`LOCAL=0`) or `git diff <target>...HEAD` (`LOCAL=1`)
2. Delegate to `aif-code-reviewer` subagent with the diff
3. Two-pass model:
   - **Pass 1 (CRITICAL):** Security, injection, race conditions, auth bypass
   - **Pass 2 (INFORMATIONAL):** Dead code, magic numbers, test gaps, style

4. **Output findings:**
   ```
   Pre-Landing Review: N issues (X critical, Y informational)
   ```

5. **If critical issues found:** Verify the failure and repair in-scope defects. Ask only for a material missing decision or scope change; do not offer to bypass a real blocker. Record false positives with evidence.

6. **After fixes:** Re-run affected tests (Step 4) before continuing.
7. **If only informational:** Include in PR body, continue.
8. **If no issues:** Output "No issues found." and continue.
## Mandatory advice checkpoint after Steps 4-5

If `--chef`, run the mandatory post-tests/local-review Chef checkpoint
before Step 6 or any versioning, changelog, commit, push, or PR write. This
checkpoint remains mandatory when `--skip-review` skips Step 5; pass the skip
reason together with test evidence. Otherwise pass review findings and fixes as
well. Include the intended PR scope and ask whether the evidence supports
proceeding. Record empty/error counsel and continue only according to the
authoritative ship gates.

## Step 6: Version Bump (conditional)

Load `release-workflow.md` and run Step 6.

## Step 7: Changelog (conditional)

Load `release-workflow.md` and run Step 7.

## Step 8: Docs Update (conditional, background)

Load `release-workflow.md` and run Step 8.

## Step 8b: Finalize plan (foreground, plan-backed ships only)

Run **synchronously before Step 9** so the finalized plan files are staged by
the ship commit. Full protocol: the "Delivery finalization (close on ship)"
section of the shared files-first plan-state reference
(`../../aif-serve/references/plan-state-files-first.md`). `PLAN` below is
`node <aif-plan>/scripts/plan.cjs`.

1. `PLAN resolve --json` for the current repo + branch. **No active plan → skip
   this step silently** (most ships carry no plan).
2. Verify checkboxes with `PLAN status <plan-dir>`; if the diff proves a phase
   done, `PLAN check <phase-file>` it (ticks every box and marks the phase
   completed). If the work is genuinely partial, `PLAN update <plan-dir> --status in-progress` and skip the
   completion below.
3. `PLAN update <plan-dir> --status completed` — rewrites `plan.md` front-matter
   `status:`, the canonical status. Step 9's scoped staging then
   commits the finalized plan files with the ship, so `status: completed` reaches
   the target branch in the same merge as the code.

Do **not** run `PLAN close` here — that is the merge flow's job (the plan stays
`active` through the review window). On any script failure, report
the plan-dir path + reason and continue the ship with a warning; never hand-edit
or delete plan files.

## Step 9: Commit

1. Stage only reviewed task-owned paths, including intended plan/version/docs artifacts and the reports this task wrote under the configured reports directory (`.aif/reports/` by default): `git add -- <owned-paths>`. Ship is where reports get committed; never stage other tasks' reports. Inspect the staged diff against ship scope; do not absorb unrelated dirty files or existing staged work.
2. Security check: scan staged diff for secrets (API keys, tokens, passwords)
   - If secrets found: **STOP**, warn user, suggest `.gitignore`
3. Compose commit message:
   - Format: `type(scope): description`
   - Infer type from changes (feat/fix/refactor/chore)
   - If version + changelog present, include in same commit
4. Commit:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Brief body describing the changes.
EOF
)"
```

## Step 10: Push

**Skip if:** `LOCAL=1`. Print `– Push: skipped (local ship)`.

```bash
git push -u origin $(git branch --show-current)
```

- **Never force push.**
- If push rejected: suggest `git pull --rebase` and retry once.

## Step 11: Create PR

**Skip if:** `LOCAL=1`. Print `– PR: skipped (local ship)` and finish with
`✓ Ready: <branch> can merge into <target>`. Do not merge unless `--merge` was passed
(see Step 12).

Check if `gh` CLI is available:
```bash
which gh 2>/dev/null || echo "MISSING"
```

If missing: output "Install GitHub CLI (gh) to auto-create PRs" and stop after push.

**Resolve writing language** before rendering the body:
```bash
node <aif-plan>/scripts/prefs.cjs get language   # null or error → English
```
Load `references/pr-template.md`.

Render the **seven required sections** plus Linked Issues / Ship Mode in the
effective language. Keep the PR **title** English conventional-commit form.
Record the language and whether it came from the `language` preference or the English default under Ship Mode.

**Link issues** collected from Step 2 using exact `Closes #N` / `Relates to #N`
keywords inside the Linked Issues section.

Create PR targeting the correct branch:
```bash
gh pr create --base <target-branch> --title "<type(scope): summary>" --body "$(cat <<'EOF'
<localized evidence-rich body from pr-template.md>
EOF
)"
```

Validate before finishing: read the body back with
`gh pr view --json body -q .body` and confirm every section heading from
`pr-template.md` (localized per its heading map) is present. A missing section
is a blocker: fix it with `gh pr edit` and check again.

**Output the PR URL** — this is the final output the user sees.

In a batch-landing repository (see "Batch-landing repositories" in the skill),
include the local verification evidence its instructions name in the body and
create the PR ready for review; after Step 11b, stop.

If PR already exists for this branch, update it instead (same contract):
```bash
gh pr edit --title "<type(scope): summary>" --body "$(cat <<'EOF'
<localized evidence-rich body>
EOF
)"
```

## Step 11b: Record plan↔PR linkage (plan-backed ships only)

**Skip if:** `LOCAL=1` (there is no PR).

If Step 8b finalized a plan, record the PR number on it so the merge flow can
match plan to PR and close it unambiguously:
```bash
node <aif-plan>/scripts/plan.cjs update <plan-dir> --linked-pr <pr-number>
```
`--linked-pr` is stored in `~/.aif/plans-state.json` (it does not touch files).
Skip silently when no plan was finalized. Do not close the plan here — `close` happens only
after the PR merges (see the shared reference's "Delivery finalization" section).

## Step 12: Merge (if `--merge`)

Load `merge-workflow.md` and run Step 12.
