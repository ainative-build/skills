# Research Taste — the reasoning protocol applied to technical research and analysis

Fable Thinking's moves, applied to questions whose answer depends on facts outside the
conversation: technology choices, "what is the best way to X", literature and docs
research, analysis of systems you do not own, decision memos. Fable 5.1's strength here is
twofold: it finds answers along an axis the question did not suggest, and it stays exact
about what the evidence does and does not show. Smaller models retrieve instead of
research — first-page results, stacked quotes, a survey with no conclusion, and priors
stated as current fact. This reference makes research decision-shaped and sourced.

## When to load this reference

Load BEFORE the first search whenever the deliverable will be acted on and rests on
external facts: technology or library evaluation, architecture options, vendor or model
choice, best-practice questions, root-cause analysis of third-party behavior, competitive
or market analysis, a research brief or memo.

## Know Your Own Defaults (research failure modes)

- **Retrieval as research** — answering from prior. Versions, prices, limits, and APIs
  decay; the answer is fluent and out of date.
- **Survey without conclusion** — listing options with no criteria, weights, or
  recommendation. The reader wanted a decision.
- **Confirmation search** — queries phrased to find support for the first idea.
- **Authority and recency bias** — the top result, the most-starred repository, the newest
  post, treated as the answer.
- **Single-source facts** — one page becomes "the docs say".
- **Fact/interpretation blur** — an analyst's opinion reported in the grammar of fact.
- **Novelty theater** — a "creative" recommendation with no evidence it works here.
- **Scope inflation** — researching the field when the decision needed one fact.

## How to think (the moves, in research order)

1. **FRAME the decision.** What decision does this research serve, who makes it, by when?
   State what answer would change the decision — if no answer would, stop. Name non-goals.
2. **Decompose into sub-questions.** For each: what evidence would settle it, and how
   load-bearing is it? Load-bearing sub-questions get researched first and deepest.
3. **Set stop rules up front.** A budget (time, tokens, sources); saturation (new sources
   repeat known ones); a decision threshold (enough to decide with a named residual risk).
4. **GROUND — rank sources.** Primary (the spec, the source code, official docs for the
   exact version, first-party benchmarks with method) > a reproduction you ran > secondary
   expert analysis > community posts > memory. Date every source; check the version it
   describes matches the version in play.
5. **Triangulate.** Two independent sources per load-bearing claim — independent means not
   citing each other. Record disagreement instead of averaging it away.
6. **Disconfirm actively.** For the emerging answer, run at least one search designed to
   find it wrong: "X problems", "X vs", "why not X", the issue tracker, the changelog's
   breaking changes. Absence of counter-evidence you never searched for is not support.
7. **Reproduce when you can.** A ten-minute spike — install it, run the snippet, hit the
   endpoint — outranks an hour of reading. Prefer it for the top candidate.
8. **Change the axis when stuck.** When every option fails a constraint, or the options
   all share one shape: reformulate the objective, challenge or relax a constraint, borrow
   from an adjacent field, invert (design the failure, then avoid it), or rebuild from
   first principles (`references/thinking-modes.md`). Then hold the new option to the same
   evidence bar as the others.
9. **Synthesize with claim types.** Facts (sourced, dated), interpretations, and
   recommendations kept visibly distinct. A criteria table. A recommendation with its
   confidence and what would change it. Open questions last.

## What good research is (evaluable, not vibes)

- **Decision-shaped** — recommendation plus criteria plus trade-offs; the reader can act.
- **Sourced and dated** — every load-bearing fact has a primary source, a date, a version.
- **Triangulated** — key facts confirmed independently; disagreements shown, not hidden.
- **Disconfirmed** — at least one falsification attempt per recommendation, recorded.
- **Calibrated** — confidence stated and matched to the evidence; unknowns listed.
- **Bounded** — stop rules honored; no survey padding.

## What to avoid (the research slop catalog — matches are failed gates)

- "According to various sources" with no source named.
- Marketing pages quoted as evidence of capability.
- Comparison tables with rows nobody asked about and no weights.
- Benchmarks without method, date, hardware, or version.
- "Best practices" lists that never name the failure each practice prevents.
- Recommending the newest thing because it is newest, or the familiar thing because it
  is familiar.
- A tutorial's architecture presented as "industry standard".
- Undated statements about pricing, limits, or availability.

## Details models habitually miss

- Version and date of every documentation page; deprecation notices; the changelog since
  your prior's cutoff.
- License and maintenance status: last release, open issues, number of maintainers.
- Constraints of THIS context: runtime, platform, budget, team skill, compliance, existing
  dependencies. The best option in general is often wrong here.
- Negative results: a feature absent from the docs is evidence, not an oversight to fill.
- Base rates: how often this class of solution actually works in comparable setups.
- "Possible" versus "supported": a demo differs from a documented, tested, versioned path.
- Total cost per completed task, not unit price.

## Verify (the loop)

1. **Source audit.** For each load-bearing claim, open the primary source; record URL,
   date, version.
2. **Independence check.** Do the two sources actually derive from different origins?
3. **Falsification pass.** One targeted counter-search per recommendation.
4. **Spike** when the harness allows: the smallest real test of the top candidate.
5. **Claim typing** on the final synthesis: every sentence is fact, interpretation, or
   recommendation, and its grammar matches.
6. **Freshness check.** Anything older than the current version of the subject is flagged.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Decision fit | a recommendation answers the framed decision | FRAME artifact |
| Sourcing | load-bearing facts have primary, dated sources | source audit list |
| Triangulation | key facts confirmed by independent sources | independence check |
| Disconfirmation | counter-search run per recommendation | search log |
| Calibration | confidence matches evidence; unknowns listed | claim typing pass |
| Bound | stop rules honored | budget log |

## Synthesis template

```text
Recommendation: <one sentence>. Confidence: <low|medium|high> because <evidence>.
Would change it: <the observation that flips the call>.
Criteria table: <options × criteria, weighted, with sources>.
Facts (dated): … | Interpretations: … | Open questions: …
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Answer from memory about versions, prices, limits | Open the primary source; date it |
| Search to confirm the first idea | Search to disconfirm it |
| Report the top result | Rank sources; triangulate the load-bearing ones |
| List options without a call | Recommend, with criteria and what would change it |
| Blend opinion into fact | Type every claim; keep the grammar honest |
| Research until the budget dies | Set stop rules; stop at saturation or threshold |
| Ship a novel option on enthusiasm | Hold it to the same evidence bar; spike it |
