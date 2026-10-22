# Test report

Lead with the outcome and its limits. For a small run, return a short inline
summary; use a durable report only when the scope needs it. Include applicable
fields below, linking existing receipts/logs instead of creating another schema
or duplicating their contents. A report is execution evidence, not a new policy.

## Compact template

```markdown
# Test report — {date} — {scope}

Outcome: verified within {scope} / observed violation / insufficient evidence.
Authority: {accepted requirement/spec and any inferred expectations}.

| Contract | Check/command | Observed result | Gap / required follow-up |
| --- | --- | --- | --- |
| {behavior and risk} | {existing test or bounded probe} | {raw status and interpretation} | {not run/skip/blocker} |

Source: {base/head plus relevant dirty/untracked input fingerprints before/after}.
Execution: {run ID, cwd, actual runner/version/config and environment class}.
Evidence: {separate output for each attempt, receipt/artifact paths and digests}.
Mandatory gates: {completed, failed, skipped or unavailable; reasons}.

Failures: {all observed failures; expected/observed, repro, classification,
and linked raw logs; retries do not erase failures}.
Coverage: {measured values, repo threshold and its source, or no configured threshold}.
Changes: {applied versus proposed; authorization; contract and remaining protection}.
Costs: {observed time/resources/model usage, estimates explicitly labelled,
and unknown metrics; no inferred zeroes}.
Cleanup: {owned processes/ports/temp roots/data; verified cleanup or remaining owner}.
Limitations: {source mismatch, partial execution, untested claims, live/provider gaps}.
```

Do not include credentials, private settings or sensitive screenshots. Preserve
raw runner outcomes and classify product defects separately from expectation,
fixture, environment, provider and tooling failures. A mandatory skip or an
unverified final-source state prevents a fully verified conclusion. Aggregate
pass counts cannot hide failed, skipped or unfinished claims.

## Freshness and reproducibility

Capture the relevant source/input identity before and after the run. Commit SHA
alone is insufficient for dirty/untracked files. Include configuration, environment
and probe/artifact identity; use existing fingerprint/receipt tools where available.
If inputs changed during execution or identity cannot be verified, state exactly
which observation remains useful and which final-state claim is unverified.

Reuse evidence only when its required validity conditions match. A replay recording
may cross revisions to perform actions again, but its new results belong to the
current source and environment. Give reruns unique output locations; preserve
earlier failures rather than overwriting them. A seed or a line saying pass is not
a reproducible evidence package. Retain artifacts under repository retention policy.

## Suite changes and efficiency

For create/audit/optimize, apply `test-lifecycle.md`. Report contract protection,
test count and per-test/shared setup timing before/after where measured. For
sampled mutation, identify the same valid faults and show killed/survived/invalid/
equivalent/inconclusive counts; setup failure is not a killed regression.

Compare planning and test-generation effort, runner/model calls, tokens, retries,
CI minutes, device CPU/peak memory and human review effort when observable.
Separate benchmark overhead from task execution. Report false positives and missed
known/seeded regressions, including the denominator and untested classes. Unknown
values stay unknown/null. Elapsed time is not billable CI minutes. Estimates and
synthetic fixture results are not measured production savings; test count or prompt
length reductions alone do not establish efficiency.

## UI and optional agentic execution

Record the charter, exact path/goal exercised, identities and outcomes asserted,
observed surfaces/viewports, and only relevant screenshot references. If an agentic
engine ran, include its version, raw errors, actual replay/live/handoff and reasons,
budget/termination state and unfinished steps. No findings from exploration does
not establish mandatory claims. Label semantic judgments separately from exact
assertions and live runs separately from synthetic fixtures.

## Impact-selection and semantic receipts

Reuse source/manifest/policy fingerprints, provider provenance, selected/skipped
group reasons, required checks and broadening from existing impact-selection
receipts. Selection evidence declares why a group was chosen, not that it passed;
link actual execution outcomes separately. Preserve deterministic fallback and
mandatory policy, including when advice is unavailable or uncertain.

Semantic reports keep baseline, effective and hypothetical plans separate. Include
consumer status, profile/threshold revisions, attempted/completed/abstained counts,
source-bound invocation batches and original capture kind. Report integration
success separately from model-quality eligibility. E2E label accuracy/confusion
is separate from regression recall; unknown provider cost/billed minutes stay
null. No live-provider or beta claim follows from synthetic replay success.
