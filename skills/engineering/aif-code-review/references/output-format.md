# Output format & aggregation rules

The whole point of this skill is that the three axes stay separate. The aggregator assembles them
without ever pooling or re-ranking findings across axes.

## Hard rules

1. **Three headings, always.** `## Standards`, `## Spec`, `## Adversarial` — each present even when
   its result is "no findings" or "skipped".
2. **Never merge or re-rank across axes.** Severity buckets rank findings *within* an axis only. A
   Medium Standards finding and a Medium Adversarial finding are not compared or ordered against
   each other.
3. **Overlap is annotated, not merged.** The same issue can legitimately surface on two axes (e.g.
   missing input validation on both Standards and Adversarial). Keep both; add a one-line
   `(also flagged by Adversarial)` annotation. Do not collapse them into one finding.
4. **Spec hard-fail marks, does not delete.** If Spec reports a required behavior MISSING, prefix
   the Standards and Adversarial sections with `provisional — pending spec fix`, but keep every
   finding. A wrong-feature change still gets its quality and security findings recorded.
5. **Most-significant per axis.** Each axis names its single most-significant issue.
6. **Name the context you don't have.** A review is bounded by what the diff, repo, and spec reveal.
   When a finding's validity or severity rests on a fact outside that boundary — how a caller outside
   the diff behaves, what's actually live in production, whether an unrequested behavior is intended —
   the review must say so, not guess and assert. Those gaps become the **Open questions** section
   (below), and the affected finding is marked *conditional* on the answer.
7. **Deepening pointers are non-blocking and never feed the roll-up.** The optional
   `## Deepening pointers` footer (below) hands off repo-scope refactoring to `aif-improve`. It is
   derived from Standards findings already emitted — never fresh analysis — and the Verdict and Risk
   computation must not read it. A pointer can never gate a merge.

## Finding format — write for a human, keep the evidence

A finding is read by a person deciding whether to merge. Give them a scannable headline, a
plain-language explanation, the evidence laid out so they can check it, and an honest "why this
matters". Two tiers by severity — every finding still carries evidence and a `[Verified]`/`[Reasoned]`
tag; readability never replaces proof.

### Blocking findings (Critical / High) — full treatment

```markdown
### [HIGH] 1. <short title naming the bug in one line>
`path/to/file.ts:42` · [Verified]

<1–3 sentences, plain language: what breaks, when it triggers, and what the user or caller sees.>

**Evidence**

| Input / trigger | Actual | Expected |
|---|---|---|
| `être hôpital âgé` (French) | detected `vi` | `fr` |
| `coração é bom` (Portuguese) | detected `fr` | `pt-BR` |

**Root cause** — <the mechanism, pointing at the code, e.g. "`ê ô â` live in the `vi` set, checked
first, so French falls through to Vietnamese">.
`[Verified]` `node -e "…"` → `-1`   ·   or `[Reasoned]` <argument from the code> + <why a run wasn't feasible>

**Why it matters** — <who hits it, how often, is it a live path, what's the blast radius>. Argue why
this is a real defect and not a harmless bad guess — the reader must be able to tell a merge-blocker
from a nitpick. **Then name the assumption this rests on.** If the severity depends on a fact you
could not confirm from the diff/repo/spec (a caller outside the diff, production config, product
intent), say so here and add a `> Conditional:` line — the finding still stands, but its size is
pending that answer, which also goes to **Open questions**.

> Conditional: severity assumes <X>. If <not-X> → <this downgrades to Low / collapses into #n / is void>.

**Fix** — <concrete approach; describe it, don't write the patch>.
```

Single-case findings replace the table with one line: `pay(2,3)` → returns `-1`, expected `5`.

### Non-blocking findings (Medium / Low) — one line each

```markdown
- [MEDIUM] `path/to/file.ts:88` — <problem in one line>. [Reasoned] <why>. Fix: <approach>.
```

Batch the Low items; never give a naming nit a five-part write-up. **Invest prose where it blocks**,
list the rest. No finding ships without evidence — pure speculation (no runnable evidence and no
sound `file:line` reasoning) is dropped, not softened.

## Verdict & risk (overall roll-up — does NOT merge axes)

After the three sections, add an overall verdict. It is a roll-up of severities, not a re-ranking of
findings across axes (the axis sections stay intact and separate):

- **Verdict:** `Request changes` if any of: an accepted Critical · a Pass-1 security finding · a
  spec-MISSING · an accepted Adversarial finding · **a `[Verified]` High wrong-result-on-realistic-
  input** (any axis — a proven wrong answer blocks regardless of which axis caught it). `Comment` if
  only non-blocking findings survive. `Approve` if none survive.
- **Approve qualifier.** If no verification command was available for this project (no test/build/
  repro could be run), you may not write a bare `Approve` — write `Approve (unverified — no test or
  build command available)`. A clean review with zero executed checks is not the same as a proven
  pass.
- **Risk:** Low / Medium / High — from blast radius × severity × how much is `[Reasoned]` vs
  `[Verified]` (more unverified High/Critical ⇒ higher residual risk).

**Evidence-tag audit (aggregator).** Before finalizing, sanity-check the tags: if a finding is tagged
`[Verified]` but its worker showed no command + output, downgrade it to `[Reasoned]`. A `[Verified]`
tag is a claim that something was run; unbacked claims get corrected, not trusted.

## Skeleton

```markdown
# aif:code-review — <mode> (<range-or-scope>)
# range-or-scope: <BASE_SHA>..<HEAD_SHA> for committed modes; "working tree" for pending;
#                 "<path> | whole tree" for codebase

## Scope
Files: <n> · Lines: +<a>/-<b> (n/a in codebase mode) · Spec source: <path|none> · Dispatch: <parallel|sequential>
PR (when #PR mode): title, stated scope vs actual diff (flag mismatch), CI status

## Standards
<Critical/High as full titled blocks (headline · file:line · description · Evidence · Root cause · Why it matters · Fix);
 Medium/Low batched as one-liners. Includes anti-slop + edge cases.>
Most significant: <one line>

## Spec
<requirement checklist table: # | Requirement | PASS/MISSING/PARTIAL/EXTRA | evidence>
<MISSING/PARTIAL findings as titled blocks; EXTRA/minor as one-liners — each with Evidence + [Verified|Reasoned]>
Most significant: <one line>

## Adversarial
<tally: N findings — A accepted / R rejected / D deferred>   (or: skipped (below threshold))
<Accepted first as full titled blocks (these block the merge), then Rejected (one line + why), then Deferred (one line + why)>
Most significant: <one line>

## Verification
<every command actually run this review + its result. Count: X findings Verified / Y Reasoned.>

## Verdict & risk
Verdict: Approve | Comment | Request changes
Risk: Low | Medium | High — <one-line rationale>

## Open questions
<Context the review could not settle that would change a finding. Omit the section only if there are
genuinely none. Each: the question — which finding(s) it affects — how each answer changes them.>
1. <question>? — affects #<n>. If <yes> → <effect on the finding>; if <no> → <effect>.

## Deepening pointers (non-blocking)
<Optional, dead-last, omitted when empty. Repo-scope refactoring this diff review won't do — handed
off to `aif-improve`. ≤3 one-liners, each referencing the findings that motivated it. No severity, no
strength badge, no before/after — those are aif-improve's artifact, not review's.>
- `<path>` — <N Standards findings cluster here (#<a>, #<b>, M-<c>)>. Candidate for `aif-improve <path>`.
```

**Building Open questions (aggregator).** The `> Conditional:` lines are the sole input to this
section — axes emit them, only the aggregator writes Open questions. Collect every `> Conditional:`
line the axes raised, plus any assumption you relied on that the diff/repo/spec did not confirm. Then:

1. **Close what's cheap first.** If a gap is answerable with a command the orchestrator can run — grep
   for the caller, read the config, check whether the path is reachable — run it, fold the answer into
   the finding, and drop the question. A review that could have grepped the caller but asked the user
   instead is lazy, not careful.
2. **Surface only the residue** — facts that need product intent, production knowledge, or the author's
   reasoning. State each as a real question tied to the finding it moves and how each answer moves it.
   These are exactly the questions the reader can answer in seconds and you cannot.
3. **A conditional finding keeps its bucket but flags the dependency** — do not silently promote a
   guess to Critical or bury a real issue as Low because a fact was missing; mark it conditional and
   let the open question carry the uncertainty.

**Building Deepening pointers (aggregator, optional).** A diff review judges the diff; it does not
restructure the repo. When the review keeps bumping into pre-existing shallowness the diff merely
touched, hand it off instead of scope-creeping into it:

1. **Derived, never discovered.** A pointer may come *only* from Standards findings already emitted
   this review, or from the context pack's dependents list. The aggregator does zero fresh
   architecture analysis — inventing depth verdicts here would be an unisolated fourth axis in
   disguise, which is worse than none.
2. **Emission threshold.** Emit a pointer only when ≥2 structural Standards findings cluster in one
   module, OR one diff-added module failed a `[Verified]` deletion test. No pointer from a hunch.
3. **Cap at 3 one-liners.** Each references the `file:line`-bearing findings that motivated it. No
   severity, no recommendation-strength badge, no cards — that is `aif-improve`'s output, not review's.
4. **Zero coupling to Verdict/Risk.** The roll-up does not read this section; a pointer never gates.
5. **Soft dependency.** Word it "candidate for `aif-improve <path>`" — a valid human recommendation
   whether or not that skill is installed. Omit the whole section when nothing meets the threshold.

## Verification gate (applies to the aggregator, and to any follow-up "fixed" claim)

Do not write that anything "passes", "is fixed", or "is done" without having run the proving command
in the current turn and read its output.

- Identify the command that would prove the claim (test suite, build, the failing repro).
- Run it fresh and read the full output / exit code.
- State the claim WITH that evidence, or state the actual status.
- If no verification command is known for this project, say so explicitly rather than implying
  success. "Changed the guard at cart.ts:42; no project test command found, so this is unverified"
  is honest. "Fixed the crash" without a run is not.
