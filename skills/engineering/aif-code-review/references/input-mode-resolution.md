# Input-mode resolution

The orchestrator resolves WHAT is being reviewed before any axis runs, then pins it to fixed SHAs
so all three axes review the exact same bytes.

## Auto-detection

| Argument | Mode | What gets reviewed |
|----------|------|--------------------|
| `#123` or a PR URL | **PR** | The PR diff (`gh pr diff 123`); if `gh` unavailable, ask for a branch/ref |
| `abc1234` (7+ hex chars) | **Commit** | That single commit (`git show`) |
| a branch / tag / ref | **Fixed-point** | `<ref>` vs HEAD, pinned at their merge-base (see Pinning) |
| `--pending` | **Pending** | Staged + unstaged working-tree changes |
| *(no argument, recent changes present)* | **Default** | The most recent commit's changes |
| `codebase` | **Codebase** | Single-pass scan of the tracked tree (v1) |

If the argument is ambiguous or absent and there is nothing recent to review, ask the user in plain
text which target they mean (no interactive-only tooling — a plain question works on every runtime).
**When no user can answer** (the skill was invoked by a pipeline or another agent), do not stall:
state the assumption explicitly and proceed with the most recent commit (default mode).

## Pinning: resolve to LITERAL identifiers, once

The orchestrator resolves the target to **literal** values (real SHAs, a real patch path — never a
shell variable) and records them in the Review Target block below. This is the single source of
truth. Workers run the command **verbatim**; they never `git rev-parse` or re-derive anything
themselves (a subagent gets a fresh shell — `$BASE_SHA` and `$PATCH_FILE` do NOT transfer into it,
so every value must be substituted literally before the prompt is written).

Resolve per mode — the resolution differs, so there is NO one-size snippet:

| Mode | Resolve base → head (run these ONCE, substitute the literal output) |
|------|----------------------------------------------------------------------|
| Commit `<c>` | `git rev-parse <c>^` → `git rev-parse <c>` — head is `<c>`, **not** `HEAD` |
| Fixed-point `<ref>` | `git merge-base <ref> HEAD` → `git rev-parse HEAD` — merge-base, so base-branch commits don't show as reverse-deletions |
| Default | `git rev-parse HEAD~1` → `git rev-parse HEAD` |
| PR `#n` | snapshot to a patch (see PR mode) — treat like pending, no local SHAs needed |
| Pending | snapshot to a patch (see Pending mode) — no `BASE..HEAD` |
| Codebase | `git ls-files` scope (see Codebase mode) — no diff, no SHAs |

Committed modes (commit / fixed-point / default) then review-command = `git diff <BASE> <HEAD>` with
those two literal SHAs. **Root / merge commits:** if `<c>^` doesn't resolve (root commit), diff
against the empty tree (`git hash-object -t tree /dev/null` → `4b825dc…`); for a merge commit, state
which parent you diffed (`<c>^1`) since a single-parent diff is partial.

**Pending mode.** Uncommitted changes live in no commit and the tree can move mid-review — snapshot
to an immutable patch, including new untracked files, and hand axes the literal path:

```
git add -N .                             # stage intent-to-add so untracked files appear in the diff
git diff HEAD > /tmp/aif-review-<pid>.patch   # staged + unstaged + untracked, vs HEAD
```

Substitute the real path (e.g. `/tmp/aif-review-8412.patch`) into the block. Axes read that file (or
`git apply --stat <path>` for the file list); they do NOT run a `BASE..HEAD` diff. Prefer asking the
user to commit or stash before a large `--pending` review — a pinned commit beats a moving tree.
Delete the patch when the review finishes.

**PR mode `#n`.** Do NOT try to pin PR base/head SHAs — a fork PR's commits aren't in the local repo.
Snapshot the PR diff to a patch and review it exactly like pending mode:

```
gh pr diff <n> > /tmp/aif-review-pr<n>.patch    # works for forks; no local objects required
```

If `gh` is unavailable, ask the user for a branch/ref and fall back to fixed-point mode. (PR mode
therefore depends on `gh`; it is the one non-built-in, and only for this mode.) Note: patch-only PR
review means `[Verified]` repros can't run against a checkout of the PR head — findings there are
`[Reasoned]` unless the user has the branch out locally.

## Review Target block (paste verbatim into EVERY axis + group worker)

Fill this once with literal values; it is the contract every worker consumes unchanged. Nothing
downstream re-derives the target.

```
REVIEW TARGET (run verbatim; do NOT re-derive)
mode:          <commit | fixed-point | default | pr | pending | codebase>
command:       git diff a1b2c3d 9f8e7d6            # LITERAL SHAs, or: read /tmp/aif-review-8412.patch
group scope:   (grouped runs only) append `-- src/api/ src/db/` to the command
changed files: src/a.ts, src/b.ts                  # the manifest — authoritative file list
spec source:   docs/prd.md | none
overlays:      base + api                           # from overlay detection below
```

## Codebase mode (v1, single-pass)

No diff and no SHAs. Scope = all tracked files, `git ls-files` (optionally narrowed by a path the
user gives). The same three axes still run and stay separate — "single-pass" means one pass per
axis over the tree, NOT one blended pass. In codebase mode the axes review whole files in scope
(the "added/modified lines only" rule does not apply — there is no diff), and the output header
shows the scope (path or "whole tree") instead of a SHA range.

**Coverage is not free — disclose it.** On anything larger than a small tree a single pass cannot
deeply read every file. State coverage honestly in the `## Scope` line (`read N of M tracked files`)
and, if you sampled rather than read all, the verdict becomes `Approve (partial — sampled N/M files)`
— never a bare `Approve` implying the whole tree was audited. For a genuinely large monorepo, prefer
narrowing the scope to a package or splitting into groups over a shallow full-tree skim.

## Context pack

After pinning, the orchestrator builds one shared context pack and injects it into all three axes.

**Prefer the `aif-recon` skill if it is installed** — hand it the changed files (and `--spec` for
spec-source discovery) and use its context report as the pack. If `aif-recon` is not present, build
the pack inline with the built-in tools below (this keeps `aif-code-review` fully functional
standalone). Either way the pack contains:

- changed files: from the mode's review target — `git diff --name-only <BASE> <HEAD>` (committed modes), `git apply --stat <patch>` (pending/PR), or `git ls-files <scope>` (codebase). This list is the `changed files` line of the Review Target block.
- likely dependents / callers of changed symbols (Grep for the changed function/type names)
- related tests (files matching the changed modules)
- the resolved spec source (see `axis-spec.md`)
- discovered standards docs (see `axis-standards.md`)

Each axis may still do its own targeted Grep/Read — the pack is a shared starting point, not a cap.

## PR-mode enrichment (`#PR`)

For a PR, the orchestrator also gathers (read-only) and puts in the context pack:

```
gh pr view <ref> --json title,body,author,baseRefName,additions,deletions,changedFiles
gh pr diff <ref> --name-only        # scope
gh pr checks <ref>                   # CI status
```

- **Scope-vs-claim check** — compare the PR's stated intent (title/body) against the actual diff
  size and files touched. A wide gap ("fix typo" with +800/−60, or files unrelated to the stated
  purpose) is itself an anti-slop signal — surface it under Standards.
- **CI status** goes in the `## Scope` line; failing checks raise the Risk level.

## Overlay detection

Before dispatch, detect which checklist overlays apply and tell the axes:

- `api.md` — route dirs (`src/routes|api|controllers/`), an OpenAPI/GraphQL schema, or a web
  framework with routes in the diff.
- `web-app.md` — `package.json` has react/vue/svelte/next/etc., or `src/pages|app|components/` /
  JSX·TSX·Vue files in the diff.

`base.md` always applies.

## Scaling: large diffs → parallel review

For a **large or multi-area diff** (rough trigger: > ~10 changed files, or clearly independent areas
like backend + frontend), split into disjoint file-groups so no single reviewer drowns in a 40-file
diff. Use `aif-recon` (if present) to propose the group split. Two rules make the fan-out actually
work — without them each group re-reads the whole diff and Spec double-counts:

1. **Scope each group's command.** A group worker's review command is the pinned command **plus a
   pathspec** for that group only: `git diff <BASE> <HEAD> -- src/api/ src/db/`. Set the `group
   scope` line of that worker's Review Target block. Without the pathspec every "group" worker
   re-reads the entire diff — four groups × three axes = twelve full-diff reads.
2. **Spec runs ONCE, not per group.** Only **Standards** and **Adversarial** fan out per file-group.
   The **Spec** axis runs a single pass over the *whole* diff — otherwise a frontend group marks
   every backend requirement MISSING and vice versa. There is one Spec section, built once.

Merge each group's Standards/Adversarial sections into the final two sections (still never
cross-ranked); the single Spec pass supplies the third. For a small diff, skip the split entirely —
one 3-axis pass is enough.
