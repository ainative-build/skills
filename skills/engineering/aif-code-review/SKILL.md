---
name: aif-code-review
description: "Adversarial, axis-separated code review. Runs three isolated passes — Standards (code smells + structure/logic/types/perf), Spec (does it match the issue/PRD), and Adversarial (security + failure-mode red-team) — and never merges or re-ranks their findings. Auto-detects the review target: a PR, a commit, a fixed-point ref diff, pending changes, or a single-pass codebase scan. Refuses to claim anything passes without verification evidence. Triggers on: 'review this', 'code review', 'review the PR', 'review my changes', 'review the diff', 'is this safe to merge', 'aif code review'."
license: MIT
metadata:
  author: ainative-build
  version: "1.2.4"
argument-hint: "[#PR | <commit> | <ref> | --pending | codebase]"
---

# aif-code-review

Three-axis adversarial code review. One skill, one standard of rigor, three isolated verdicts that
are reported side by side and never blended together.

**Principles:** evidence over assertion · technical correctness over comfort · verify before you
claim.

The three axes:
- **Standards** — conventions + Fowler smells + structure/logic/types/perf + anti-AI-slop + the
  quality/perf checklist items + edge cases.
- **Spec** — does the change implement what was actually requested, no less and no unrequested more.
- **Adversarial** — assuming requirements are met, how can it still break or be exploited (injection,
  auth/IDOR, races, XSS/CSRF, failure modes) — driven by the security checklists.

Every finding carries **evidence** and a **`[Verified]`/`[Reasoned]`** tag; the review ends with an
overall **Verdict** (Approve / Comment / Request changes) and **Risk** level.

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

**Explorer:** if the `aif-recon` skill is installed, use it to do the codebase exploration AND the
spec-source discovery — pass it the changed files plus `--spec`, and use its report as the context
pack. Fall back to the inline built-in scouting when `aif-recon` isn't present, so this skill works
standalone.

Record the pinned target in the **Review Target block** (see `input-mode-resolution.md`) with
**literal** SHAs / patch path — never a `$VAR`, which does not survive into a fresh subagent shell.
Paste that block verbatim into every axis prompt; each axis runs its command itself and **never
re-derives the range**. **Never inline the diff/file text into the axis prompts** (it triples token
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

Write findings for a human, per `references/output-format.md` → Finding format: Critical/High get a
full titled block (headline → `file:line` → plain-language description → **Evidence** table/line →
**Root cause** → **Why it matters** → **Fix**); Medium/Low are batched one-liners. Cap each axis at
~500 words of findings *prose* so aggregation stays within budget — the cap excludes evidence tables
and the Root-cause/Verify command lines. Never drop evidence to hit a word count; the evidence is the
point.

Each axis applies concrete depth, not just judgement:
- **Checklists** — `references/checklists/base.md` always, plus `api.md` / `web-app.md` when the
  orchestrator's overlay detection fires (Standards takes the quality/perf items, Adversarial takes
  the security items).
- **Anti-slop** — the Standards axis applies `references/anti-ai-slop.md` (structural = High, micro
  = Low/Medium) — high-value on AI-assisted diffs.
- **Edge cases** — every axis probes and, where cheap, reproduces the edge cases in
  `references/edge-cases.md`.

The Adversarial axis honors its scope gate (skip on trivial, non-sensitive diffs — see
`axis-adversarial.md`).

**Large or multi-area diffs** also fan out across disjoint file-groups (each group gets the 3-axis
pass) so no reviewer drowns in a 40-file diff — see `input-mode-resolution.md` → Scaling.

### 5. Aggregate

Follow `references/output-format.md` exactly. Three headings always; severity ranks within an axis
only; overlaps annotated not merged; a Spec hard-fail marks the other axes "provisional" but keeps
their findings; each axis names its single most-significant issue. Finish with an overall **Verdict**
(Approve / Comment / Request changes) and **Risk** level — a roll-up that does NOT re-rank findings
across axes.

Then build **Open questions** from every `> Conditional:` line the axes raised: close the ones a
command can settle (grep the caller, read the config) and fold the answer back into the finding;
surface only the residue that needs product intent or production knowledge, each tied to the finding
it moves and how each answer moves it. A review must name the context it lacked, not assert past it.

Optionally close with **Deepening pointers** — a non-blocking footer that hands repo-scope refactoring
off to `aif-improve`. Derive it *only* from Standards findings already emitted (never fresh analysis),
cap it at 3 one-liners, and keep it out of the Verdict/Risk roll-up. See `output-format.md` → Building
Deepening pointers.

### 6. Evidence & verification gate

**Every finding carries evidence** — a concrete `file:line` trigger → wrong behavior — and a tag:
`[Verified]` (a repro/test/grep was actually run, with command + output) or `[Reasoned]` (argued
from the code). Prefer `[Verified]`; the reviewer has `Bash`. Speculation with neither is dropped.

Beyond per-finding evidence, never write that anything "passes", "is fixed", or "is safe to merge"
without running the proving command in this turn and reading its output. If no verification command
is known, say so explicitly. See `references/output-format.md`.

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
`Grep`, `Read`, `Bash`, and (where available) the parallel-subagent tool for axis dispatch (the
`Task`/`Agent` tool on Claude Code). It never edits code; it reviews and reports.

**Runtime mapping.** Tool names above are Claude Code's; on Codex/Cursor, map them to that runtime's
own search / file-read / shell / subagent equivalents — the capability is what matters, not the name.
The one non-built-in is `gh`, used only by PR mode (with a graceful "ask for a ref" fallback when it
is absent).

## References

- `references/reviewer-persona.md` — shared reviewer identity, evidence rule, suppressions.
- `references/axis-standards.md` — Standards axis (Fowler smells + quality + anti-slop + edge cases).
- `references/axis-spec.md` — Spec axis (spec discovery + compliance).
- `references/axis-adversarial.md` — Adversarial axis (red-team + verdicts + security checklists).
- `references/anti-ai-slop.md` — anti-AI-slop taxonomy (Standards lens).
- `references/edge-cases.md` — edge-case probing + verification, all axes.
- `references/checklists/base.md` `api.md` `web-app.md` — detection-based concrete checklists.
- `references/input-mode-resolution.md` — mode detection, SHA pinning, context pack, PR enrichment, overlay detection, large-diff scaling.
- `references/output-format.md` — aggregation, per-finding evidence, verdict/risk, verification gate.
