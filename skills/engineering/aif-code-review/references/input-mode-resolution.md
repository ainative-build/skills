# Input-mode resolution

The orchestrator resolves WHAT is being reviewed before any axis runs, then pins it to fixed SHAs
so all three axes review the exact same bytes.

## Auto-detection

| Argument | Mode | What gets reviewed |
|----------|------|--------------------|
| `#123` or a PR URL | **PR** | The PR diff (`gh pr diff 123`); if `gh` unavailable, ask for a branch/ref |
| `abc1234` (7+ hex chars) | **Commit** | That single commit (`git show`) |
| a branch / tag / ref | **Fixed-point** | `git diff <ref>...HEAD` |
| `--pending` | **Pending** | Staged + unstaged working-tree changes |
| *(no argument, recent changes present)* | **Default** | The most recent commit's changes |
| `codebase` | **Codebase** | Single-pass scan of the tracked tree (v1) |

If the argument is ambiguous or absent and there is nothing recent to review, ask the user in plain
text which target they mean (no interactive-only tooling — a plain question works on every runtime).

## Pinning: the review target command

Pin the target once, then hand every axis the SAME **review-target command** for its mode. Axes
re-run that command themselves (the diff/file text is never inlined into prompts). The command is
mode-specific — do NOT hardcode `git diff $BASE_SHA $HEAD_SHA` for every mode:

| Mode | Pinned review-target command each axis runs |
|------|---------------------------------------------|
| PR | `git diff $BASE_SHA $HEAD_SHA` (base = PR base SHA, head = PR head SHA) |
| Commit | `git diff $BASE_SHA $HEAD_SHA` (base = `<commit>^`, head = `<commit>`) |
| Fixed-point `<ref>` | `git diff $BASE_SHA $HEAD_SHA` (base = `$(git rev-parse <ref>)`, head = `$(git rev-parse HEAD)`) |
| Default | `git diff $BASE_SHA $HEAD_SHA` (base = `HEAD~1`, head = `HEAD`) |
| Pending | read the pinned patch file `$PATCH_FILE` (see below) — NOT a `BASE..HEAD` diff |
| Codebase | enumerate `git ls-files` scope (see "Codebase mode" below) — no diff, no SHAs |

For the committed modes, resolve the SHAs up front and pass them plus the command:

```
BASE_SHA=$(git rev-parse <base>)     # HEAD~1, the ref, the commit parent, or the PR base
HEAD_SHA=$(git rev-parse HEAD)
```

**Pending mode.** Uncommitted changes live in neither `BASE_SHA` nor `HEAD_SHA`, and the working
tree can move mid-review — so snapshot to an immutable patch and hand axes `$PATCH_FILE`:

```
PATCH_FILE=/tmp/aif-review-$$.patch
git diff HEAD > "$PATCH_FILE"            # all uncommitted tracked changes (staged + unstaged) vs HEAD
```

Axes review `$PATCH_FILE` (read it, or `git apply --stat "$PATCH_FILE"` for the file list); they do
NOT run a `BASE..HEAD` diff in pending mode. Prefer asking the user to commit or stash before a
large `--pending` review — a pinned commit is always more reliable than a moving tree.

## Codebase mode (v1, single-pass)

No diff and no SHAs. Scope = all tracked files, `git ls-files` (optionally narrowed by a path the
user gives). The same three axes still run and stay separate — "single-pass" means one pass per
axis over the tree, NOT one blended pass. In codebase mode the axes review whole files in scope
(the "added/modified lines only" rule does not apply — there is no diff), and the output header
shows the scope (path or "whole tree") instead of a SHA range.

## Context pack

After pinning, the orchestrator builds one shared context pack and injects it into all three axes.

**Prefer the `aif-recon` skill if it is installed** — hand it the changed files (and `--spec` for
spec-source discovery) and use its context report as the pack. If `aif-recon` is not present, build
the pack inline with the built-in tools below (this keeps `aif-code-review` fully functional
standalone). Either way the pack contains:

- changed files: from the mode's review target — `git diff --name-only $BASE_SHA $HEAD_SHA` (committed modes), `git apply --stat "$PATCH_FILE"` (pending), or `git ls-files <scope>` (codebase)
- likely dependents / callers of changed symbols (Grep for the changed function/type names)
- related tests (files matching the changed modules)
- the resolved spec source (see `axis-spec.md`)
- discovered standards docs (see `axis-standards.md`)

Each axis may still do its own targeted Grep/Read — the pack is a shared starting point, not a cap.
