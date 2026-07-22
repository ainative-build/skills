---
name: aif-code-review
description: "Adversarial, axis-separated code review. Runs three isolated passes — Standards (code smells + structure/logic/types/perf), Spec (does it match the issue/PRD), and Adversarial (security + failure-mode red-team) — and never merges or re-ranks their findings. Auto-detects the review target: a PR, a commit, a fixed-point ref diff, pending changes, or a single-pass codebase scan. Refuses to claim anything passes without verification evidence. Triggers on: 'review this', 'code review', 'review the PR', 'review my changes', 'review the diff', 'is this safe to merge', 'aif code review'."
license: MIT
metadata:
  author: ainative-build
  version: "1.0.0"
argument-hint: "[#PR | <commit> | <ref> | --pending | codebase]"
---

# aif-code-review

Three-axis adversarial code review. One skill, one standard of rigor, three isolated verdicts that
are reported side by side and never blended together.

**Principles:** evidence over assertion · technical correctness over comfort · verify before you
claim.

The three axes:
- **Standards** — engineering conventions + Fowler code smells + structure/logic/types/performance.
- **Spec** — does the change implement what was actually requested, no less and no unrequested more.
- **Adversarial** — assuming requirements are met, how can it still break or be exploited.

A change can pass one axis and fail another (right feature, poor code; or clean code, wrong
feature). Keeping the axes separate is what stops one from masking the other.

## Workflow

```
1. Resolve input mode + pin fixed point   (orchestrator)
2. Discover spec source                    (orchestrator)
3. Build the shared context pack           (orchestrator)
4. Dispatch the 3 axes                     (parallel, or sequential fallback)
5. Aggregate — 3 separate sections         (orchestrator)
6. Verification gate                       (orchestrator)
```

Steps 1–3 and 5–6 are done by the orchestrator (this session). Only step 4 fans out. All
user-facing resolution (ambiguous target, missing spec) happens in the orchestrator BEFORE
dispatch, because axis workers cannot ask the user questions.

### 1–3. Resolve, pin, pack

Follow `references/input-mode-resolution.md`:
- auto-detect the mode from the argument (PR / commit / ref / `--pending` / `codebase` / default),
- pin the **review target** for the mode: committed modes → `BASE_SHA`/`HEAD_SHA`; `--pending` →
  a snapshot patch file; `codebase` → the `git ls-files` scope (see the per-mode table in
  `references/input-mode-resolution.md`),
- discover the spec source (commit msgs → named path → scan `docs/ specs/ .scratch/ plans/` → ask
  the user in plain text),
- build one shared context pack (changed files, dependents, tests, spec, standards docs).

Each axis re-runs the **pinned review-target command for the mode** itself — `git diff
$BASE_SHA $HEAD_SHA` for committed modes, the snapshot patch for `--pending`, the tracked-file
scope for `codebase`. **Never inline the diff/file text into the axis prompts** (it triples token
cost and can desync).

### 4. Dispatch the three axes

Each axis is one review by the persona in `references/reviewer-persona.md`, briefed by its axis file
(`axis-standards.md`, `axis-spec.md`, `axis-adversarial.md`), given the context pack. The persona is
fully self-contained and inlined into each axis prompt — a skills.sh-only install (no plugin) needs
no named agent; a generic subagent carrying the persona is sufficient. The Claude Code plugin also
registers a named `aif:code-reviewer` agent for convenience.

**Capability branch — this is load-bearing for portability:**

- **If parallel subagents are available** (e.g. Claude Code, via the Task tool): spawn the three
  axes as three independent, context-isolated subagents IN PARALLEL. Isolation is the point —
  no axis sees another's findings, so none anchors on another.

- **Otherwise** (Codex, Cursor, or any runtime without subagent spawning): run the three axes as
  **three sequential passes** in this session, one axis at a time, each starting from the same
  context pack. Keep each pass mentally isolated — complete and record one axis's section before
  starting the next; do not let an earlier axis's findings bleed into a later one. The output is
  identical: three separate sections.

Cap each axis at ~500 words of findings so aggregation stays within budget.

The Adversarial axis honors its scope gate (skip on trivial, non-sensitive diffs — see
`axis-adversarial.md`).

### 5. Aggregate

Follow `references/output-format.md` exactly. Three headings always; severity ranks within an axis
only; overlaps annotated not merged; a Spec hard-fail marks the other axes "provisional" but keeps
their findings; each axis names its single most-significant issue.

### 6. Verification gate

Do not report that anything "passes", "is fixed", or "is safe to merge" without running the proving
command in this turn and reading its output. If no verification command is known for the project,
say so explicitly instead of implying success. See `references/output-format.md` → Verification gate.

## Input modes (v1)

| Invocation | Reviews |
|-----------|---------|
| `aif-code-review` | recent changes (last commit) |
| `aif-code-review #123` | a GitHub PR (`gh pr diff`; falls back to asking for a ref) |
| `aif-code-review abc1234` | a single commit |
| `aif-code-review <ref>` | fixed-point diff `<ref>...HEAD` |
| `aif-code-review --pending` | staged + unstaged (snapshotted) |
| `aif-code-review codebase` | single-pass whole-codebase scan |

Full-codebase *parallel* multi-reviewer audit is intentionally out of v1 (planned v0.2).

## Tools used

Built-ins only — the skill is self-contained and assumes no other skill or plugin: `git`, `Glob`,
`Grep`, `Read`, `Bash`, and (where available) the `Task` tool for parallel axis dispatch. It never
edits code; it reviews and reports.

## References

- `references/reviewer-persona.md` — the shared reviewer identity + behavioral checklist.
- `references/axis-standards.md` — Standards axis brief (Fowler smells + quality).
- `references/axis-spec.md` — Spec axis brief (spec discovery + compliance).
- `references/axis-adversarial.md` — Adversarial axis brief (red-team + verdicts).
- `references/input-mode-resolution.md` — mode detection, SHA pinning, context pack.
- `references/output-format.md` — aggregation rules + verification gate.
