# Plan State: Files-First Model

Shared by every skill that creates, resolves, or mutates a plan (`aif-plan`,
`aif-serve`, and any other skill referencing this file).
This is the single description of where plan state lives — do not restate a
divergent copy in another skill; link here instead.

`<aif-plan>` below means the installed aif-plan skill directory, a sibling of
the calling skill. Every `plan.cjs` command accepts `--json`.

## Canonical state = repo files

- `.aif/plans/<timestamp>-<slug>/plan.md` plus `phase-NN-*.md` in the repo ARE the
  plan. Hand-editable Markdown. They are the deliverable of planning skills and
  the only thing implementation skills read to know what to build.
- A project with no GitHub remote, no `gh` auth, and no network still has a
  fully working plan — because the files are the plan.

## `plan.cjs` and local state

- `node <aif-plan>/scripts/plan.cjs` reads plan and phase status straight from
  the files; there is no database or index to rebuild.
- Lifecycle state (`active`, `closed`, `archived`), the current-plan pointer and
  GitHub ids live in `~/.aif/plans-state.json`, local to this machine.
  `plan.cjs reindex` scans the plans directory and reports state entries whose
  plan directory no longer exists.
- File-writing commands (`create`, `check`, `uncheck`, `update --status`,
  `phase update --status`, `phase close`) write the Markdown files; use them for
  status changes instead of hand-editing a status line. `phase update --status`
  also updates the matching row in the `plan.md` Phases table. `status` and
  `show` are read-only; `close` and `archive` change only the local state and
  never touch the files (the files already carry their terminal `status:` from
  the ship commit). Because `close` is state-only, closing an unmerged or
  abandoned plan whose file still reads `in-progress` leaves it active on
  another machine — pair such a close with `plan.cjs update <plan-dir> --status
  cancelled` so the terminal state lives in the files.

## Current-plan resolution

- `plan.cjs use <plan-dir>` sets the current-plan pointer for this worktree so
  downstream skills (`aif-serve` and other agents) can resolve the active plan
  without re-scanning or requiring a GitHub link. `plan.cjs use --clear` removes it.
- `plan.cjs resolve` returns the active plan, matching by `--issue <n>` when
  given, then the pointer, then the plan whose `branch:` front matter equals the
  current branch. It reports `ambiguous` with candidates when several match.
- `plan.cjs show <plan-dir>` prints plan content and per-phase progress for a
  skill to consume — read plan state this way (or from the files), not from
  GitHub issue comments.

## GitHub issue = optional visibility projection, never canonical

- Publishing is the agent's job, not the script's: the agent projects a
  validated plan onto a GitHub issue (create or update) with `gh` / the GitHub
  API. There is no publish command.
- Publishing is never required and never the source of truth. Skip it entirely
  in a repo with no GitHub remote, no `gh` auth, or when the user does not ask
  for it — the plan is still fully usable as files. When the user asks to publish
  but `gh`/GitHub auth is unavailable, skip without failing and report one line
  suggesting how to enable it (e.g. `gh auth login`).
- Publishing never overwrites the body of a pre-existing issue a plan was
  created from; it only adds links, comments, or labels.
- If the files and a linked issue ever disagree on status, the files win. The
  issue is a mirror, not a lock.

### Publish-safety protocol

When an agent does project a plan onto an issue, follow this so the projection is
safe, idempotent, and recoverable.

1. **Gate every publish, not just the first.** Visibility can flip and new phase
   evidence appears, so on each write confirm the target repo/issue visibility is
   acceptable for the content, then run a secret scan over the *rendered*
   projection text after composing it. Never project raw logs, env values,
   tokens, credentials, or local absolute paths. If the rendered body would
   exceed GitHub's comment limit (65,536 chars), truncate to a repo-relative
   plan-path link — do not split across comments.
2. **Provenance lives in local state, not the files.** Persist the linkage with
   the shipped commands (a hand-written `issue:` front-matter key is not read by
   `plan.cjs resolve`):
   - `plan.cjs update <plan-dir> --issue <n> --root-comment-id <id>` for the
     plan's issue and root tracking comment;
   - `plan.cjs phase update <phase-file> --comment-id <id>` for a per-phase
     tracking comment.
   Persist the ids **immediately** after creating the comment, before any further
   writes; if the persist fails, print the ids in the report for manual recovery.
   A human-readable `Tracking: #<n>` line in the plan *body* is a fine
   non-authoritative breadcrumb.
3. **Adopt before you create (bootstrap).** Local state is per-machine, so a
   fresh clone, a teammate's machine, or a lost `~/.aif/plans-state.json` has no
   recorded ids even when the issue already carries the projection. Embed a
   stable marker in every bot-authored projected comment:
   `<!-- aif-plan <plan-dir-basename> hash=<12-hex> branch=<branch> -->`.
   Before creating a new root comment, scan the issue's existing comments for that
   marker; on a unique authored-by-self match, **adopt** it (persist its id via
   step 2) instead of posting a duplicate.
4. **Author-verify before editing.** Only edit a comment the current `gh`
   identity authored (`gh api .../comments/<id> -q .user.login` equals the
   authenticated login). Identities differ across machines and CI (a
   `GITHUB_TOKEN` acts as `github-actions[bot]`), so on a mismatch — or a missing
   or edited marker — **append a new marked comment**; never edit another author's
   comment and never abort the delivery over it.
5. **Rev-echo for idempotency and tamper detection.** The marker carries a short
   content hash of the rendered body. Before rewriting, re-read the comment: if
   the hash matches what you last wrote, skip the write; if the marker or hash is
   missing or altered, a human or another bot touched it — append rather than
   overwrite. Do not build compare-and-swap or "the on-issue revision is newer,
   stop and reconcile" logic: the projection is derived and regenerable, the files
   always win, and GitHub's comment API has no atomic swap. Last-writer-wins among
   your own verified projections is acceptable.
6. **Fail safe on missing or rate-limited issues.** A 404/410 (issue transferred,
   deleted, or locked) → report and stop; never auto-create a replacement issue,
   and never clear recorded ids without user confirmation (a transfer only
   changes the repo-scoped API path, so 404 ≠ deleted). On rate limits or a
   partial write, back off, skip, and report — never retry-loop; create-then-
   record ordering plus the adoption marker keeps a lost write self-healing.

## Delivery finalization (close on ship)

When a plan-backed change ships, finalize the plan so its files stop reading as
active work — the core "stale plan read as false context" mitigation. The file
write and the state close are **two different commands at two different moments**:

**On ship success, before the ship commit — finalize the FILES:**

1. Resolve the active plan (`plan.cjs resolve`). A resolve-miss means no active
   plan for this repo + branch — **skip finalization silently**; most ships carry
   no plan. Only an ambiguity result, or a failure partway through the steps
   below, warrants a warning plus the exact plan-dir path.
2. Verify the phase checkboxes reflect reality (`plan.cjs status` prints the
   progress summary). If the diff proves a phase's boxes done, `plan.cjs check
   <phase-file>` them. If the work is genuinely partial, `plan.cjs update
   <plan-dir> --status in-progress` and stop — never blind-complete a half-done
   plan.
3. When the plan is actually complete, `plan.cjs update <plan-dir> --status
   completed`. `--status` rewrites the `plan.md` front-matter `status:` (the
   canonical state). Inspect the finalized plan diff, then stage only the
   intended, owned plan files with `git add -- <owned-plan-paths>`, preserving
   unrelated staged and dirty work. The ship commit then carries those finalized
   plan files onto the branch, so `status: completed` reaches the target branch
   in the **same merge** as the code it describes — the files can never claim
   completion for code that did not land. Make this a synchronous/foreground
   step; do not fold it into a background writer.

Do **not** run `plan.cjs close` here. During the review window the correct
intermediate state is `status: completed` (file) + `state: active` (local state):
`plan.cjs resolve` only returns active plans, so an early close would blind serve
during review-fix cycles, and there is no reopen command — a rejected PR must not
leave a stuck-closed plan.

**After PR creation — record the linkage:** `plan.cjs update <plan-dir>
--linked-pr <n>` (state-only) so the merge flow can match this plan to its PR
unambiguously.

**On merge success — close the plan and optionally project:**

1. Match the merged PR to its plan via the recorded linked PR (`plan.cjs list
   --json` shows `linkedPr`) or plan branch == PR head branch. A match-miss means
   already closed or unrelated — skip silently; on ambiguity, skip and report
   rather than guessing.
2. `plan.cjs close <plan-dir>` — a state-only transition to `closed`. The files
   already carry `status: completed` from the ship commit.
3. Optional projection: if the plan records an issue / root-comment id, **append**
   a new marked comment (e.g. "plan completed, PR #N merged" with the
   `<!-- aif-plan … -->` marker) — never edit the root comment, so a
   close-time projection cannot clobber anyone. Still apply the publish gates from
   the publish-safety protocol above (visibility check, secret scan of the
   rendered text, 65,536-char truncation).

Degrade honestly: if `plan.cjs` is missing or any step fails, report the exact
plan-dir path and reason and complete the delivery with a warning — never
hand-edit a status line and never delete plan files.

## Rules for skills consuming this model

1. Resolve the current plan with `plan.cjs resolve` (which honours the
   `plan.cjs use` pointer first) — never assume a GitHub issue must exist.
2. Read phase content via `plan.cjs show` (or the files directly), not via
   issue comments.
3. Mutate status via the `plan.cjs` file-writing commands; do not hand-edit a
   status line or a Phases table status cell.
4. Treat `--github` (the agent publishing via `gh` / the GitHub API) as an
   additive, opt-in visibility step that runs after the plan is already valid as
   files — never as a prerequisite for planning or implementation to proceed.
