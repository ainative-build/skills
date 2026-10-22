# Document Vision — reading diagrams, charts, tables, and scanned pages as evidence

Fable Thinking's moves, applied to visual inputs: figures, tables, and text nested in PDFs,
images, slides, and screenshots. Fable 5.1 reads these well; the reasoning failure that
remains for every model is not seeing but claiming — treating a visual read as OBSERVED
when it is an estimate through a noisy channel, and filling unreadable gaps with plausible
values. The procedure: transcribe with confidence marks, reason on the transcription, verify
by computation and by the strongest channel the harness grants.

## When to load this reference

Load BEFORE answering whenever an input is an image, a PDF page, a scan, a screenshot, a
slide, a chart, a diagram, or a table inside a picture — "what does this figure show",
"extract this table", "summarize this PDF", "compare these charts", "read this receipt or
form" — and whenever the harness can render, crop, zoom, or extract a text layer.

## Know Your Own Defaults (visual-reading failure modes)

- **Plausible infill** — completing a blurry digit or a cut-off cell with what "should" be
  there. Fluent, confident, invented.
- **Precision inflation** — reading "about 40%" off a bar and reporting 41.3%.
- **Structure loss** — flattening merged headers into wrong column assignments; a row
  shifted by one cell corrupts every conclusion downstream.
- **Axis blindness** — log scales, truncated or broken axes, dual axes, units, per-capita
  versus absolute, all ignored.
- **Legend inversion** — series colors swapped; the wrong line read.
- **Caption skipping** — units, sample size, exclusions, and adjustments live in captions
  and footnotes; the body text may contradict the figure.
- **Order errors** — page order, multi-column reading order, rotated pages.
- **OCR confusions** — 0/O, 1/l/I, 5/S, 8/B; dropped diacritics in Vietnamese; decimal
  comma versus point; thousands separators.

## How to think (the moves, in reading order)

1. **FRAME.** What question must this document answer? Which elements are load-bearing
   (which cells, which series, which node)? What precision does the decision need?
2. **Inventory the artifact.** Pages, figures, tables, captions, footnotes, legends, units.
   Note resolution and readability per element before reading any value.
3. **Transcribe before reasoning.** Tables → rows and columns as structured text with the
   header hierarchy kept. Charts → axis definitions plus per-series data points with an
   estimated error band. Diagrams → nodes, directed edges with labels, groupings. Text →
   verbatim with `[unreadable]` markers. Tag every item EXACT (text layer or clearly
   legible), ESTIMATED (visual read, with ± band), or UNREADABLE. Never invent a value.
4. **Cross-check internally.** Row and column totals; percentages summing to 100; sequences
   monotonic where they must be; counts matching the caption's n; chart values agreeing
   with numbers quoted in the body text.
5. **Use the strongest channel.** Text-layer extraction beats OCR beats visual estimate; the
   underlying data file beats the chart; vector text can be extracted exactly. Zoom or
   crop when the harness allows; re-render at higher resolution.
6. **Reason on the transcription with Claim Discipline.** Propagate estimate error into
   conclusions: a comparison that flips inside the ± band is undecided, and says so.
7. **Deliver** what was read, at what confidence, and what could not be read.

## What good document reading is (evaluable, not vibes)

- **Faithful** — every reported value traceable to a location (page, table, row and
  column, series).
- **Typed** — EXACT, ESTIMATED, and UNREADABLE kept visibly apart.
- **Structure-preserving** — header hierarchy, units, and footnote conditions carried into
  the extraction.
- **Cross-checked** — totals recomputed; figure and text reconciled where both exist.
- **Decision-adequate** — precision matches the question; no false precision.

## What to avoid (the slop catalog — matches are failed gates)

- More significant digits than the figure's resolution supports.
- "The chart clearly shows" attached to a visual estimate.
- A table reproduced with cells shifted one column.
- "In thousands", "adjusted", "excluding X" dropped from a header or footnote.
- A PDF summary written from the first page and the headings.
- A screenshot of code or config treated as verbatim without noting truncation.

## Details models habitually miss

- Units and scale multipliers in axis titles and headers; currency and date formats by
  locale.
- Legends with similar colors; dashed versus solid; stacked versus grouped bars.
- Truncated y-axes exaggerating differences; log axes; broken axes.
- Merged cells, multi-row headers, subtotal rows, notes columns.
- Footnote markers attached to values; "n/a" versus 0 versus blank.
- Multi-column reading order; sidebars; text rendered as images inside PDFs (absent from
  the text layer).
- Rotation, watermarks, redactions, strike-through and revision marks.
- Vietnamese and other diacritic scripts: OCR drops or swaps tone marks ("Hà Nội" → "Ha
  Noi", "Hà Nôi"); confirm names from the text layer or flag them.
- Charts embedded as vector versus raster: vector text is exact when extracted.

## Verify (the loop — a re-look is not verification)

1. Extract the text layer when a tool exists; diff it against the visual read for every
   load-bearing value.
2. Recompute derived numbers (totals, shares, growth rates) from the extracted cells.
3. Zoom or crop unreadable regions; if still unreadable, mark UNREADABLE — never estimate
   beyond the declared band.
4. Reconcile figure against body text; report contradictions rather than choosing one.
5. Re-check structure: each row's cell count equals the header count; hierarchy intact.
6. Repair and re-verify the whole extraction — fixing one row can shift its neighbors.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Fidelity | each value has a location | transcription with references |
| Typing | EXACT / ESTIMATED / UNREADABLE separated | tag audit |
| Structure | headers, units, footnotes preserved | cell-count and hierarchy check |
| Consistency | totals and text/figure agreement hold | recomputation |
| Precision | matches the decision's need | FRAME precision note |

## Delivery template

```text
Read: <pages/figures/tables covered>.
Exact: <values from text layer or clearly legible>.
Estimated: <value ± band, source element>.
Unreadable: <what and where>.
Cross-checks: <totals recomputed, text/figure agreement, contradictions>.
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Answer from the picture directly | Transcribe with tags, then reason on the transcription |
| Fill a blurry digit with the likely one | Mark it UNREADABLE or give a band |
| Report a bar's height to one decimal | Report the estimate with its ± band |
| Flatten merged headers | Keep the hierarchy; check cell counts per row |
| Skip captions and footnotes | Read them first; they define units and exclusions |
| Trust a re-look | Extract, recompute, reconcile |
