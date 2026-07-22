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

## Every finding carries evidence + a verification tag

Each finding, in every axis, is written as:

```
- [Critical|High|Medium|Low] file:line — <problem>
  Evidence: <concrete trigger → observed/derivable wrong behavior>
  Verify: [Verified] <command + result>   |   [Reasoned] <why, from the code>
  Fix: <approach>
```

No finding without an `Evidence:` line. Prefer `[Verified]` (the reviewer ran a repro/test/grep and
read the output) over `[Reasoned]`. Findings that are pure speculation — no runnable evidence and no
sound file:line reasoning — are dropped, not softened.

## Verdict & risk (overall roll-up — does NOT merge axes)

After the three sections, add an overall verdict. It is a roll-up of severities, not a re-ranking of
findings across axes (the axis sections stay intact and separate):

- **Verdict:** `Request changes` if any axis has an accepted Critical or a blocking (Pass-1 /
  spec-MISSING / accepted-adversarial) finding · `Comment` if only non-blocking findings ·
  `Approve` if no findings survive.
- **Risk:** Low / Medium / High — from blast radius × severity × how much is `[Reasoned]` vs
  `[Verified]` (more unverified High/Critical ⇒ higher residual risk).

## Skeleton

```markdown
# aif:code-review — <mode> (<range-or-scope>)
# range-or-scope: <BASE_SHA>..<HEAD_SHA> for committed modes; "working tree" for pending;
#                 "<path> | whole tree" for codebase

## Scope
Files: <n> · Lines: +<a>/-<b> (n/a in codebase mode) · Spec source: <path|none> · Dispatch: <parallel|sequential>
PR (when #PR mode): title, stated scope vs actual diff (flag mismatch), CI status

## Standards
<severity-bucketed findings; each with Evidence + [Verified|Reasoned] + Fix. Includes anti-slop + edge cases.>
Most significant: <one line>

## Spec
<requirement checklist table>
<MISSING/PARTIAL/EXTRA findings, each with Evidence + [Verified|Reasoned]>
Most significant: <one line>

## Adversarial
<tally: N findings — A accepted / R rejected / D deferred>   (or: skipped (below threshold))
<Accepted first, then Rejected, then Deferred; each with Evidence + [Verified|Reasoned]>
Most significant: <one line>

## Verification
<every command actually run this review + its result. Count: X findings Verified / Y Reasoned.>

## Verdict & risk
Verdict: Approve | Comment | Request changes
Risk: Low | Medium | High — <one-line rationale>
```

## Verification gate (applies to the aggregator, and to any follow-up "fixed" claim)

Do not write that anything "passes", "is fixed", or "is done" without having run the proving command
in the current turn and read its output.

- Identify the command that would prove the claim (test suite, build, the failing repro).
- Run it fresh and read the full output / exit code.
- State the claim WITH that evidence, or state the actual status.
- If no verification command is known for this project, say so explicitly rather than implying
  success. "Changed the guard at cart.ts:42; no project test command found, so this is unverified"
  is honest. "Fixed the crash" without a run is not.
