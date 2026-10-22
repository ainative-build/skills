---
name: aif-ship
description: "Ship a completed branch via tests, review, commit, push and PR, with official/beta aliases, Chef advice and gated merge plus CI convergence."
when_to_use: "Invoke when work is done and needs a PR."
category: workflow
keywords: [ship, PR, merge, push, release, advice, chef]
argument-hint: "[official|stable|main|beta|dev|next] [--both] [--chef] [--merge] [--skip-tests] [--skip-review] [--skip-journal] [--skip-docs] [--dry-run]"
license: MIT
metadata:
  author: ainative-build
  version: "2.4.0"
---

# Ship: Unified Ship Pipeline

Single command to ship a feature branch. Continue through authorized repairs and verification; stop for evidenced external blockers or unresolved material decisions.

**Inspired by:** gstack `/ship` by Garry Tan. Adapted for framework-agnostic, multi-language support.

`<aif-plan>` means the installed aif-plan skill directory and `<aif-git>` the installed aif-git skill directory, both siblings of this skill.

## Arguments

| Flag | Effect |
|------|--------|
| `official`, `stable`, `main` | Normalize to `official`; ship to the detected default branch (main/master). Full pipeline with docs + journal |
| `beta`, `dev`, `next` | Normalize to `beta`; ship to the detected development branch (dev/beta/develop). Lighter pipeline, skip docs update |
| (none) | Auto-detect: if base branch is main/master → official, else → beta |
| `--both` | Dual-target ship: beta stage first, then a gated stable stage (see Dual-target ship). Supersedes a positional mode token |
| `--chef` | Run the ship-to-PR path under advisory-only `aif-chef` supervision |
| `--merge` | After PR creation, merge it through the `aif-git` merge-pr workflow (readiness gate, merge, post-merge CI to green) |
| `--skip-tests` | Skip test step (use when tests already passed) |
| `--skip-review` | Skip pre-landing review step |
| `--skip-journal` | Skip journal writing step (also honors `journal.auto=false` config preference) |
| `--skip-docs` | Skip docs update step |
| `--dry-run` | Show what would happen without executing |

## Ship Mode Detection

```
Normalize one positional mode token before side effects:
  - official | stable | main → official
  - beta | dev | next        → beta
  - multiple or unknown tokens, including unknown `--flags` → stop and ask; never guess
If mode = "official" → target = main/master (auto-detect default branch)
If mode = "beta"     → target = dev/beta/develop (auto-detect dev branch)
If no mode token      → infer from current branch naming:
  - feature/* hotfix/* bugfix/* → official (target main)
  - dev/* beta/* experiment/*  → beta (target dev/beta)
  - unclear                    → ask_user capability
```

Aliases select a canonical mode; they do not force a literal branch name.

## Dual-target ship (`--both`)

When `--both` is present, ship to both targets in sequence — the beta pipeline
first, then a gated stable stage. `--both` supersedes a positional mode token;
if one is also given, warn once and continue in dual-target mode. It composes
with `--chef`, `--merge`, and the skip flags. With `--dry-run`, it simulates
the beta stage only and reports the stable stage as not-simulated.

Load `references/dual-stage-workflow.md` for the stage sequencing, the stable
stage gate (beta PR exists; with `--merge`, beta CI green first), the
promotion-convention path with its unrelated-work stop, and the completion
contract. The stable stage never force-pushes, never bypasses branch
protection, and never merges a promotion PR that sweeps unrelated work without
asking.

## Advisory supervision (`--chef`)

When `--chef` is present, the workflow MUST spawn `aif-chef` to supervise
the local ship-to-PR path, because the flag's entire contract is that a
supervisor saw the change. Load `../aif-brainstorm/references/advisory-supervision.md`
for supervisor identity, host detection, and model routing (Claude
subscription → Fable 5; Codex → `gpt-6-astra` + low effort, falling back to sol, terra, then luna; Cursor →
`claude-fable-5-high`). Chef returns counsel, never code; the main agent
remains responsible for every decision, edit, and gate.

Mandatory normal-path checkpoints:

- **After pre-flight, before mutation** — pass the resolved canonical mode,
  detected target, branch/diff summary, constraints, and ask for a go/no-go plus
  the highest risk to watch.
- **After tests and local review, before versioning/commit/push/PR writes** —
  pass test evidence, findings and fixes, intended PR scope, and ask whether the
  evidence supports proceeding.
- **When stuck or before a high-stakes decision** — pass approaches tried, the
  exact blocker or irreversible choice, and ask for a legitimate next step.

Empty/error counsel is recorded as a non-fatal advisory failure; authoritative
ship gates still decide whether to proceed. If `--chef` is present and no
delegation call occurs, the workflow is incomplete.

When `--merge` is also present, add one more mandatory checkpoint:

- **After the PR exists, before Step 13 merges** — pass the PR URL, its check
  and review state, and ask for a go/no-go on merging.

`--chef` never bypasses tests, review blockers, branch protection, security
policy, or the merge-pr readiness gate.

## Batch-landing repositories

Some repositories land pull requests through their own batch-landing owner (a
merge train, landing bot, or scheduled routine) rather than per-PR CI and
author merges. Treat a repository as batch-landing only when its own
instructions (`CLAUDE.md`, `AGENTS.md`, or its contributing or workflow docs)
declare that owner; never infer it from branch names or missing CI. When they
do:

- Run the local verification those instructions require, and put the evidence
  they name (for example a verification receipt line) in the PR body.
- Create the PR ready for review. Keep it draft only when that evidence is
  missing.
- Stop after Step 12b, even with `--merge`: skip Step 13, and do not enable
  auto-merge, update the branch, merge, or wait for PR checks. Report
  `Merge=delegated` with the landing owner and `CI=n/a`.

## When to Stop (blocking)

- On target branch already → abort
- Merge conflicts that can't be auto-resolved → stop, show conflicts
- Test failures outside repair authority, unavailable dependencies/credentials, or repeated unresolved failure → report exact evidence and remaining work
- Critical issues requiring a scope/product decision → ask_user capability; repair ordinary branch-caused issues within scope
- Major/minor version bump needed → ask_user capability

## When NOT to Stop

- Uncommitted changes → include only files owned by this task and intended for this ship; preserve unrelated dirty files
- Patch version bump → auto-decide
- Changelog content → auto-generate
- Commit message → auto-compose
- No version file → skip version step silently
- No changelog → skip changelog step silently

## Pipeline

```
Step 1:  Pre-flight      → Branch check, mode detection, status, diff analysis
Step 2:  Link Issues      → Find/create related GitHub issues
Step 3:  Merge target     → Fetch + merge origin/<target-branch>
Step 4:  Run tests        → Auto-detect test runner, run, check results
Step 5:  Review           → Two-pass checklist review (critical + informational)
Step 6:  Version bump     → Auto-detect version file, bump patch/minor
Step 7:  Changelog        → Auto-generate from commits + diff
Step 8:  Journal          → Write technical journal via /aif-journal (see the shared "Journal step — opt-out" contract: --skip-journal flag or journal.auto config skips)
Step 9:  Docs update      → Update project docs via an aif-docs-manager subagent (official only)
Step 9b: Finalize plan    → plan.cjs update <plan-dir> --status completed (plan-backed; foreground, staged by Step 10)
Step 10: Commit           → Conventional commit with version/changelog
Step 11: Push             → git push -u origin <branch>
Step 12: Create PR        → gh pr create with structured body + linked issues
Step 12b: Link plan↔PR    → plan.cjs update <plan-dir> --linked-pr <n> (plan-backed; no close until merge)
Step 13: Merge            → if --merge: aif-git merge-pr workflow on the PR (skipped in batch-landing repositories)
```

**Detailed steps:** Load `references/ship-workflow.md`
**Auto-detection:** Load `references/auto-detect.md`
**PR template:** Load `references/pr-template.md`
**Merge:** Load `references/merge-workflow.md`

## Writing language + PR body

Before Step 12, resolve the writing language with
`node <aif-plan>/scripts/prefs.cjs get language` (`null` or an error means
English) and author the PR body in that language. Titles stay English
conventional commits. The body must include the seven evidence sections of
`references/pr-template.md` (plus Linked Issues / Ship Mode). Prefer honest
`None` / `Not run` / `Unavailable` over invented narrative.

## Token Efficiency Rules

- Steps 4 (tests) and 5 (review): delegate to `aif-tester` and `aif-code-reviewer` subagents — don't inline
- Steps 8 (journal) and 9 (docs): run in **background** — don't block pipeline
- Step 2 (issues): use single `gh` command batch — avoid multiple API calls
- Skip steps early via flags to save tokens on unnecessary work
- Beta mode auto-skips: docs update (Step 9)
- Capture step outputs inline — don't re-read files already in context

## Quick Start

User says `/aif-ship` → run full pipeline → output PR URL.
User says `/aif-ship beta` → ship to dev branch with lighter pipeline.
User says `/aif-ship official` → ship to main with full docs + journal.
User says `/aif-ship stable` or `/aif-ship main` → normalize to official mode.
User says `/aif-ship dev` or `/aif-ship next` → normalize to beta mode.
User says `/aif-ship beta --chef --merge` → supervised ship, then gated merge and CI convergence.
User says `/aif-ship --both --merge` → beta PR, beta merge to green, then the gated stable stage.

## Output Format

```
✓ Pre-flight: branch feature/foo, 5 commits, +200/-50 lines (mode: official)
✓ Issues: linked #42, created #43
✓ Merged: origin/main (up to date)
✓ Tests: 42 passed, 0 failed
✓ Review: 0 critical, 2 informational
✓ Version: 1.2.3 → 1.2.4
✓ Changelog: updated
✓ Journal: written (background) / skipped (opt-out via --skip-journal or journal.auto)
✓ Docs: updated (background)
✓ Committed: feat(auth): add OAuth2 login flow
✓ Pushed: origin/feature/foo
✓ PR: https://github.com/org/repo/pull/123 (linked: #42, #43)
✓ Advice: 2 checkpoints completed / failed with reason / not requested
✓ Merge: merged / delegated(landing owner) / blocked(reason) / not requested
✓ CI: green / red / pending / n/a
```

## Important Rules

- **Tests gate the ship.** Run them unless valid same-revision evidence supports `--skip-tests`. Classify failures, fix authorized branch-caused defects and rerun affected checks; do not advance to publication with red evidence.
- **Never force-push.** Use a plain `git push`; a force push rewrites history other people have already pulled.
- **Ask only for unresolved expensive decisions:** scope-changing critical findings and major/minor version bumps. Repair in-scope defects and continue on established defaults.
- **Auto-detect everything.** Test runner, version file, changelog format, target branch — detect from project files.
- **Framework-agnostic.** Works for Node, Python, Rust, Go, Ruby, Java, or any project with a test command.
- **Subagent delegation.** Use `aif-tester` for tests, `aif-code-reviewer` for review, `aif-journal-writer` for journal, `aif-docs-manager` for docs. Don't inline.
- **Merge delegation.** `--merge` runs the `aif-git` merge-pr workflow, which refuses on conflicts, red CI, `CHANGES_REQUESTED`, or branch protection. `--skip-review` skips only the local Step 5 review.
- **Fail closed on merge state.** When `--merge` is requested, a merged/green completion claim requires `Merge=merged` and `CI=green`; a blocked, red, pending, or unavailable state stops the run and is reported as such.
- **Dry-run has no delegation side effects.** `--dry-run` stops before `aif-chef` or any merge.
- **Background tasks.** Journal and docs run in background to not block the pipeline.

## Workflow Position

**Typically follows:** `/aif-code-review` (ship after review passes)
**Typically precedes:** `/aif-journal` (document after shipping)
**Related:** `/aif-code-review` (review before shipping), `/aif-test` (test before shipping)
