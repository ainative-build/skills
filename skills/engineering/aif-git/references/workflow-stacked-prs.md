# Stacked Pull Requests Workflow (`gh stack`)

GitHub native **Stacked Pull Requests** — public preview (commands verified
2026-08-03; preview surface may change). Execute via `aif-git-manager` subagent.

**Agent posture:** this workflow rewrites history and merges *multiple* PRs at
once. Treat every history-rewriting and multi-PR step as gated, not automatic —
same readiness discipline as `references/workflow-merge-pr.md`.

## What it is

An ordered chain of PRs where each layer targets the layer below it (not the
trunk). Reviewers check layers in parallel; merging lands the chain up to a
chosen layer in one all-or-nothing operation. Branch protection and required
checks still gate what reaches the trunk.

## Prerequisites

```bash
gh --version                        # need 2.0+
gh auth status                      # must be authenticated
gh extension install github/gh-stack   # one-time install
```
If exit code is `9` (feature disabled), the preview is not enabled for that
repo — stop and report; do not fall back to hand-rolled base-branch chains.

## Lifecycle

### 1. Start a stack
```bash
gh stack init                       # interactive: adopt current branch as layer 1
gh stack init feat-a feat-b -b main # explicit branches, trunk = main
```

### 2. Add a layer
```bash
gh stack add -A -m "feat(scope): layer summary"   # stage all, commit, branch on top
```

### 3. Submit (push branches + open/update PRs)
```bash
gh stack submit --auto              # --auto skips the per-branch PR-title prompt
```

### 4. Keep in sync (trunk moved, or a lower layer changed)
```bash
gh stack sync                       # fetch, rebase, push, sync PR state in one step
gh stack rebase --downstack         # cascade a rebase toward the trunk
gh stack rebase --continue          # resume after resolving a conflict
gh stack rebase --abort             # bail out safely, no partial state
```

### 5. Merge
Confirm with the user first — this lands **every** PR up to and including the
chosen one, in a single all-or-nothing operation.
```bash
gh stack view                          # inspect the chain before merging
gh stack merge                         # merge the whole active local stack
gh stack merge <pr-number> --squash    # merge up to and including that PR
```
The positional argument is a **PR number** (or a stack number for a stack you do
not have checked out) — **not** a layer index; do not pass a small integer
meaning "layer N". Do not prescribe `-y`/`--yes` in the happy path; it skips the
multi-PR confirmation. Unmerged PRs above the merge point are automatically
rebased and retargeted by GitHub.

## Inspect & navigate

```bash
gh stack view [--json]              # show the chain (machine-readable with --json)
gh stack checkout <stack-number|pr|branch>  # by stack number, PR, or branch name
gh stack switch                     # interactive layer switch
gh stack up [n] / down [n]          # move away from / toward the trunk
gh stack top / bottom / trunk       # jump to ends or trunk
```

Out of scope here (exist, but not covered by this workflow): `modify`,
`unstack`, `link`, `push`, `alias`. Reach for them only on explicit user request.

## Safety (agent guardrails)

- **History rewrite:** `sync` and `rebase` force-push **stack branches only** —
  never the trunk or a shared protected branch. See
  `references/safety-protocols.md`.
- **Multi-PR merge:** requires explicit user confirmation, like the merge-pr
  readiness gate. Never auto-confirm a stack merge.
- **Stop conditions by exit code** — surface and stop, do not loop:

  | Code | Meaning | Action |
  |------|---------|--------|
  | 0 | success | continue |
  | 1 | generic error | inspect output, report |
  | 2 | not in a stack | run from a stacked branch, or `init` first |
  | 3 | rebase conflict | resolve, then `rebase --continue` or `--abort` |
  | 4 | API failure | retry after checking `gh auth status` / network |
  | 5 | invalid arguments | fix the command |
  | 6 | disambiguation needed | branch is in multiple stacks; specify which |
  | 7 | rebase in progress | finish with `--continue`/`--abort` first |
  | 8 | stack locked | another operation holds the lock; wait, do not force |
  | 9 | feature disabled | preview not enabled for repo; stop and report |
  | 10 | recovery required | a `modify` session needs `--continue`/`--abort` |

## Repo policy interaction

- **Merge queue:** native merge queues support stacks — a merge group may exceed
  the configured size cap by up to ~50% to keep a stack intact. Safe to use.
- **Strict, non-queue repos** (branch protection requires branches up to date +
  serialized/manual merges): each merge stales the sibling PRs, so the stack
  still lands **bottom-up**, one layer per update-and-merge cycle. Land from the
  bottom and expect a re-check after each merge.
