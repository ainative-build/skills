# Opportunity report format

Markdown in chat is the default. `--html` adds a self-contained visual report; it never replaces the
markdown.

## Recommendation strength (the architecture analog of severity)

Rank each candidate by how confident the evidence makes you — not by how big the refactor is:

- **Backed** — the caller count behind the deletion test is `[Verified]` (you ran the count/test),
  the depth verdict it supports is soundly `[Reasoned]`, and the payoff is concrete. Do this.
- **Worth a look** — the friction is real but the best shape is genuinely open, or the payoff
  depends on a judgment call. Bring it to the design conversation.
- **Speculative** — a hunch worth naming, not yet backed. Say so plainly; don't dress it up.

A candidate that would be Backed *if* an unconfirmed fact holds is not Backed — it's Worth a look
with a `> Conditional:` line (see below). Never promote a guess by omitting the doubt.

## Candidate card (markdown)

```markdown
### [Backed] 1. <the deepening named in one line>
Modules: `path/a.ts`, `path/b.ts`

**Friction** — <what's shallow / leaky / scattered now, with concrete `file:line` evidence>.

**Deletion test** — <inline it mentally: nothing got harder → shallow decoration, candidate stands |
each caller inherits the hard part → deep, drop the candidate>.
[Verified] `grep -rc "callSite(" src | …` → 14 call sites. [Reasoned] each re-derives the guard, so
one deep module would remove 14 copies.
(or [Reasoned] <why, from the code> + <why a count wasn't feasible> — Reasoned-only evidence caps the
badge at Worth a look)

**Deepening** — <plain English: the deeper module, the narrow interface, the seam it creates>.

**Payoff**
- Leverage — <what callers stop having to know / do>.
- Locality — <what change/bug/knowledge now lives in one place>.
- Test surface — <what becomes testable through the interface that wasn't before>.

**Before → After**
<a compact text sketch of the shape change; the --html report draws it. e.g.
 before: 14 callers → each builds the query + handles the null + logs
 after:  14 callers → orderStore.find(id)   (query/null/log hidden)>

> Conditional: strength assumes <X — e.g. these 14 sites really share one policy>. If <not-X> →
> drops to Worth a look / splits into two candidates.
```

Batch nothing — architecture candidates are few and each deserves its card. But keep prose tight; the
evidence lines and sketch carry the weight.

## Report skeleton

```markdown
# aif-improve — <scope>

## Scope
Area: <path | whole repo> · Modules walked: <N of M> · Domain docs: <CONTEXT.md | none> · ADRs: <docs/adr | none>
<if whole-repo and sampled: one line on how coverage was bounded>

## Candidates
<cards, strongest first>

## Top recommendation
<which one to tackle first and why — one short paragraph>

## Open questions
<facts that would change a candidate's strength, from the > Conditional: lines — each tied to the
candidate and how the answer moves it. Omit only if genuinely none.>
```

Close by asking the user which candidate to pursue — do not start designing interfaces in the report.

## ADR conflicts

If a candidate contradicts an existing ADR, surface it only when the friction is real enough to
warrant reopening the decision, and mark it clearly in the card:

```markdown
> ⚠ Contradicts ADR-0007 (chose the thin-adapter split). Worth reopening because the split now costs
> more locality than it buys — but this reverses a recorded decision, so treat as Worth a look at most.
```

Don't enumerate every refactor an ADR forbids. One honest flag, or silence.

## `--html` visual report (optional)

When `--html` is passed, also write a self-contained HTML file to the OS temp dir so nothing lands in
the repo:

- Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (`%TEMP%` on Windows). Write to
  `<tmpdir>/aif-improve-<timestamp>.html` — a fresh file per run. Open it (`open` on macOS,
  `xdg-open` on Linux, `start` on Windows) and tell the user the absolute path.
- **Self-contained, CDN-based:** Tailwind (CDN) for layout, Mermaid (CDN) for graph-shaped diagrams
  (call graphs, dependency edges, sequences). Use hand-built divs/SVG for the before/after shape
  diagrams where a graph would be clumsy. Every candidate gets a **before/after** visual.
- Each candidate is a card with the same fields as the markdown (Files · Friction · Deepening ·
  Payoff · Before/After diagram · strength badge), ending with the Top recommendation.
- Use `CONTEXT.md` vocabulary for domain nouns and the `module-depth.md` vocabulary for the
  architecture — never invent a third naming scheme.

The HTML is a presentation of the same candidates; the markdown report remains the source of truth
and the thing the design conversation works from.
