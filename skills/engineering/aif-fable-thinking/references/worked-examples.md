# Worked Examples — Default Mode vs. Fable Thinking

Seven end-to-end traces showing the protocol applied — Examples 0–3 exercise the core
moves; Examples 4–6 exercise the domain playbooks (root cause and prevention, solution
exploration, delegate verification). Each starts with the reasoning a model produces by
default, then the protocol run. The point is not that the default answer
is always wrong — it is that when it is wrong, nothing in the default process would have
caught it.

---

## Example 0 — The outage report (the Floor, alone, is enough)

**Ask:** "Our company email server went down an hour ago. Should I report the outage to
IT by email or by phone? Email would give us a paper trail."

### Default-mode run

"Email — a written report creates a paper trail, gives IT the details in searchable form,
and lets them triage asynchronously." Fluent, process-flavored, delivered with total
confidence — and wrong. The surface ("which reporting channel is better?") matched the
written-beats-verbal template; the template answered; the first sentence of the actual
question never got read. This is template hijack, and the trap is baited precisely to
look too trivial to check — the paper-trail detail is there to feed the template.

### Protocol run (the Floor only — no five moves needed)

**Goal.** Main verb: *report*; object: *the outage*. End-state: *IT knows the email
server is down.* Note two things about that sentence. It names the object's finished
state, not a milestone — "the report was sent" would be a milestone, and milestones are
where wrong answers hide. And it mentions neither "email" nor "phone": a goal statement
that contains one of the offered options is the question's framing smuggled in as the
goal, and it makes every later check pass vacuously ("email → report sent → done").

**Follow-through.** Run the movie for "email" — all the way to the goal-check frame, not
just to "sent": you compose the report and hit send; the message enters the down email
server; it never reaches IT; at the final frame IT still does not know. The goal state
fails — "email" was never an answer to this question, however good its paper trail would
be. A run that stops at "sent" would have scored both options as fine; the trap only
becomes visible at the last frame.

**Leftovers.** The draft answer never used "email server went down" — the one detail
that decides everything. The paper-trail argument is bait: it makes channel quality feel
like the decision when channel *availability* is.

**Answer.** "Phone — the report has to travel over a channel that is still up, and email
is the thing that's broken. If you want the paper trail, follow up with a written ticket
once the server is restored."

### Same trap, other costumes

- "Print the return-shipping label and seal it inside the box" (the carrier reads the
  outside of the box)
- Any question where one option routes the fix through the broken thing, or quietly
  leaves the goal's object behind — the errand that needs the object present, the
  message sent over the dead channel, the backup stored on the failing disk.

The transferable rule: an answer is an action in the world — check it against the world,
not against the question's multiple-choice framing. The trap is never this specific
question; it is any question where a stored template answers before the details are
read. Total cost of the check: about three sentences of thought.

---

## Example 1 — Bug diagnosis: the "flaky" CI test

**Ask:** "TestCheckoutTotal fails randomly in CI, maybe 1 run in 5. Can you fix the flake?"

### Default-mode run

"Intermittent CI failure" pattern-matches to timing. Add a retry annotation or a sleep,
CI goes green, done. Symptom suppressed; cause still in the codebase; the test no longer
guards anything.

Failure modes: pattern-match satisfaction, frame adoption (the word "flaky" was inherited
as a diagnosis — it is testimony), completion pressure (green CI feels like done).

### Protocol run

**Move 1 — FRAME.** Deliverable: root cause plus a fix that keeps the test meaningful —
not green CI at any cost. Load-bearing fact to check first: is this actually
nondeterministic timing, or deterministic under some hidden condition?

**Move 2 — GROUND.** Read the actual failure output, literally. It is an assertion:
`expected total 59.98, got 89.97` — a wrong VALUE, not a timeout, not a connection error.
That single observation kills the timing frame: sleeps and retries cannot fix a wrong
number. (OBSERVED. The "flaky = timing" idea was PRIOR all along.)

**Move 3 — REASON.** The wrong value equals the correct total plus one extra item, so
state is leaking in from somewhere. Three hypotheses:

- H1: test-order dependence — another test leaves data behind in a shared fixture.
- H2: genuine race in the checkout code under parallel test execution.
- H3: CI-environment difference (database version, locale, time zone).

Discriminating checks, not confirming ones: run the failing test alone 20 times
(splits H1 from H2/H3), then run the full suite with a fixed seed order (isolates H1's
trigger). Result: alone, 20/20 green; full suite, fails exactly when `TestCartMerge` runs
first. Mechanism, stated end-to-end: `TestCartMerge` inserts a cart row → its cleanup only
runs on the success path → package-level fixture reuses the connection → leftover row joins
into checkout's total. Every step checkable; H2 and H3 discarded on evidence, not vibes.

**Move 4 — ATTACK.** Strongest objection: "maybe there is also a race, and order-dependence
is masking it." Cheap kill-test: apply the cleanup fix, run the suite 20 times in parallel
mode — 20/20 green. Weakest link, said out loud: 20 runs bounds the flake rate, it does not
prove zero; the original failure rate (~1 in 5) would almost certainly have reappeared.

**Move 5 — DELIVER.** "The test is not flaky — it is order-dependent. `TestCartMerge`
skips cleanup on its failure path and leaks a cart row into the shared fixture;
`TestCheckoutTotal` then sums the extra item (59.98 + 29.99 = 89.97, the exact failure
value). Fixed by moving cleanup to a deferred/teardown block. Evidence: 20/20 green in
isolation before the fix, 20/20 green in full parallel suite after. Open risk: 20 runs
bounds but does not prove; if it ever recurs, the fixture itself should stop being shared."

---

## Example 2 — Code review: the innocent retry change

**Ask:** Review a small PR: "extend the HTTP retry helper to also retry on 4xx — fixes
checkout flakiness we saw on Friday." Diff is four clean lines.

### Default-mode run

The diff is small, readable, well-tested for style; existing tests pass. "LGTM, maybe add
a comment." The review evaluated the text of the change, never its meaning.

Failure modes: reviewing at the wrong altitude (mechanics instead of design), no invariant
ledger, frame adoption ("fixes flakiness" accepted as true because the author said so).

### Protocol run

**Move 1 — FRAME.** Deliverable: a verdict on whether this change is safe and actually
fixes Friday's problem. Load-bearing facts: what does "retry" promise callers today, and
what actually failed on Friday?

**Move 2 — GROUND.** Two lookups, both cheap. The helper's contract (docstring plus call
sites): "retries transient failures; safe because requests are idempotent." Friday's
incident log: the checkout errors were `429 Too Many Requests` — not a generic 4xx.

**Move 3 — REASON.** Invariant ledger for the change:

- **Preserves:** function signature, call sites compile untouched.
- **Breaks (silently):** the semantic contract. 4xx responses are deterministic client
  errors — retrying a 400/401/403 cannot succeed and now hammers the API; retrying a POST
  that returned 402/409 risks duplicate side effects on non-idempotent endpoints.
- **Risks:** rate-limit amplification — retrying 429s *without backoff* makes Friday's
  incident worse, not better.

Negative space scan: no test exercises the new retried class; no idempotency guard was
added; no backoff/jitter accompanies the one status (429) that genuinely deserves retrying.
Altitude check: the failure is being patched at implementation level, but it lives at
design level — "which failures are retryable" is a contract question, not a loop condition.

**Move 4 — ATTACK.** Objection to my own verdict: "maybe their API returns 4xx for
transient states." Kill-test: grep the API client for status handling and check the
provider's docs — transient states are 429 and 503 only. Objection survives nowhere.

**Move 5 — DELIVER.** "Request changes — this widens retries to all 4xx, but Friday's
failures were specifically 429s. Retrying deterministic 4xxs cannot succeed, risks
duplicate POST side effects, and retrying 429 without backoff amplifies the original
incident. Suggest: retry 429 and 503 only, with exponential backoff and jitter, plus a
test for each. The four lines are clean; the contract they change is not."

---

## Example 3 — Analysis: the conversion drop that wasn't

**Ask:** "Signup conversion dropped ~30% last week. It has to be the new pricing page —
rewrite it before we lose more."

### Default-mode run

Accept the frame, audit the pricing page, produce a persuasive rewrite. If the real cause
lies elsewhere, the rewrite ships noise, the actual problem keeps burning, and next week
the same conversation happens angrier.

Failure modes: frame adoption (user's diagnosis taken as fact), no discriminating evidence,
answer-shaped output (a rewrite is deliverable-shaped regardless of whether it helps).

### Protocol run

**Move 1 — FRAME.** The user's goal is recovering signups — that is the contract. Their
diagnosis (pricing page) is testimony. Deliverable: verified cause first, then the fix that
matches it. Load-bearing fact: does the drop's timing actually line up with the pricing
release?

**Move 2 — GROUND.** Pull the numbers instead of reasoning about them. Daily signups and
conversion rate for 21 days, plus deploy dates. OBSERVED: the drop starts Tuesday; the
pricing page shipped Thursday. Two days of drop precede the alleged cause — the headline
frame is dead on arrival, by timeline alone.

**Move 3 — REASON.** Hypotheses for a Tuesday break:

- H1: traffic mix shifted (a paid campaign paused → lower-intent visitors dominate).
- H2: measurement broke (an analytics/consent change dropped signup events).
- H3: a funnel step actually broke for some segment (form, email verification).

Discriminating check: compare *dashboard* signup events against *database* account
creations for the same window. That one comparison splits H2 from H1/H3 cleanly.
Result: database signups are flat week-over-week; dashboard events are down 30%. The
business did not lose signups — the tracker lost events. Mechanism: Tuesday's release
notes show a consent-banner update; the signup event now fires only after analytics
consent, so non-consenting users' signups vanished from the dashboard while remaining in
the database. Every step checkable.

**Move 4 — ATTACK.** Objection: "maybe both — tracking broke AND pricing hurt
conversion." Kill-test: recompute conversion from database signups over pricing-page
sessions for the three days since Thursday — flat versus the prior week, within noise.
Weakest link: three days is a short window for the pricing verdict; say so.

**Move 5 — DELIVER.** "Your signups did not drop — your measurement did. Database account
creations are flat; the 30% fall exists only in analytics events, and it starts Tuesday
with the consent-banner release (signup events now fire only after consent), two days
before the pricing page shipped. Fix the event wiring, not the pricing copy. The pricing
page shows no conversion effect in database-side numbers so far — though three days is a
thin sample, so re-check after a full week. Rewriting the page now would have treated a
healthy patient."

---

## Example 4 — The "just add a nil check" request (root cause and prevention)

**Ask:** "Some users get a 500 when downloading their invoice PDF. The stack trace points
at `customer.address.country` being nil. Just add a nil check so it stops crashing."

### Default-mode run

Add the nil check, render an empty country, the 500 disappears, done in four minutes. The
crash is gone and the invoices are now silently wrong: the tax line depends on the
country, and nothing tells anyone. The mechanism that produced nil countries is still
producing them.

Failure modes: symptom patching, frame adoption (the user's fix accepted as the task),
stopping at the line that threw.

### Protocol run (per `references/debugging-root-cause.md`)

**FRAME.** Goal: invoices are correct and downloadable — not "the endpoint stops
throwing". The nil check is testimony about the fix, not the fix.

**Reproduce.** Pull one affected customer id from the error log; the download fails
deterministically for that id. OBSERVED: the address row has `country: null`; the other
fields are present.

**Differential diagnosis.** H1: an import path writes addresses without a country. H2: a
migration nulled the column. H3: country is legitimately optional for some product. The
discriminating check is one query: creation timestamps and source of every null-country
row. Result: all of them were created through the partner import endpoint, none before the
date that endpoint shipped. H2 dies (no migration touched the column); H3 dies (the tax
rule requires a country for every invoice).

**Chain to the root.** 500 ← nil country ← the import handler maps `countryCode` while the
partner sends `country_code` ← the "address has a country" invariant is enforced only in
the web form, not at the model or database boundary ← nothing rejects an invalid address
at write time. Confirmed by prediction: send the partner payload with `countryCode`
renamed, the row gets a country and the PDF renders; send the original, it does not.

**Fix at the altitude of the cause.** The invariant moves to the boundary: the model
rejects addresses without a country; a NOT NULL constraint follows a backfill from the
partner's records; the import handler accepts both key spellings and validates. The PDF
path now fails loudly with a clear error instead of rendering a wrong invoice. Sibling
search: the same mapping mismatch exists for `postal_code`; fixed in the same change.

**Prove and prevent.** The reproduction passes; a regression test posts the partner's real
payload shape; a model test proves an address without a country is rejected; the suite is
green. Prevention: the constraint, a contract test built from the partner's fixture, and
an alert on import validation failures.

**DELIVER.** "The crash was a symptom. The partner import endpoint mapped the wrong key
for country, and nothing enforced the invariant at write time, so invalid addresses
reached the invoice renderer. Fixed at the boundary (validation, constraint after
backfill, handler accepts both keys), plus the same bug in postal codes. Proof: repro
passes; regression and model tests fail without the fix; suite green. A nil check alone
would have shipped wrong tax lines silently. Open: 312 affected rows are backfilled; three
had no country in the partner data either and are flagged for manual follow-up."

---

## Example 5 — Solution exploration: "should we add Elasticsearch?"

**Ask:** "Staff need to search customers in the admin (about 200k rows in Postgres) by
name, email, or phone. Should we set up Elasticsearch?"

### Default-mode run

"Yes — Elasticsearch, with a sync pipeline from Postgres; roughly two weeks." The question
proposed a solution and the answer adopted it; no criteria, no alternatives, no
measurement. First-option lock-in on someone else's first option.

### Protocol run (per `references/solution-exploration.md`)

**Criteria first.** Must: prefix and substring match on name, email, phone; under 300
milliseconds at the 95th percentile; results consistent with the database within seconds;
no new infrastructure unless a must-have requires it. Should: typo tolerance. Cost of
error: low (internal tool), and reversible. Abandon condition: measured latency fails on
production-shaped data.

**Question the problem.** Check the logs for what staff actually type: seven in ten
searches are a pasted full email address. "Search" here is mostly exact lookup; relevance
ranking was never required.

**Option set.** A: Postgres trigram index with pattern matching. B: Postgres full-text
search vectors. C: Elasticsearch or OpenSearch with a sync pipeline. D: a hosted
lightweight search engine. E: the removal option — an exact index on email and phone as
the fast path, with A as the fallback.

**Kill-tests, cheapest first.** B: full-text vectors do not do substring or email
matching — killed by a must-have in a two-minute read. A: build the trigram index on a
copy and run twenty realistic queries — measured 40 milliseconds at the 95th percentile
on 200k rows; the "Postgres is too slow" assumption is dead. C and D: killed by "no new
infrastructure" once A passed the must-haves; noted that they were killed by the
criterion, not by their capability. E: confirmed by the log data.

**Spike.** Only A needed one: thirty minutes, on production-shaped data, including the
longest names. Budget held.

**Decision and record.** E plus A. Decision record: chosen options, the rejects with the
observation that killed each, assumptions (row count grows under ten times in two years),
revisit trigger (rows above five million or a relevance-ranking requirement).

**ATTACK.** Did the favorite get an easier test? A was the cheapest to test, which is the
rule, but its kill-test was also the strictest (measured latency); the rejects died on
criteria, not on prejudice. Stated in the record.

**DELIVER.** "No — not yet. Seven in ten searches are exact emails, and a trigram index
answers the rest at 40 milliseconds p95 on your 200k rows. Ship an exact-match fast path
plus the trigram index (half a day) instead of Elasticsearch plus a sync pipeline (two
weeks and an operational dependency). Revisit if rows pass five million or staff need
ranked relevance; the record lists what would change the call."

---

## Example 6 — The delegate reports "all 14 handlers migrated, tests pass"

**Ask (to the controller):** A worker sub-agent was given fourteen API handlers to migrate
from callback style to async. It reports: "Status: DONE. All 14 handlers migrated; tests
pass."

### Default-mode run

Relay it: "Migration complete, tests green." Merge. The report was fluent and had a status
line; it was never checked.

Failure modes: report credulity, fan-in without verification, the controller speaking in
the delegate's voice.

### Protocol run (per `references/subagent-orchestration.md`)

**Read the report as testimony.** Status parsed: DONE. Every sentence after it is a claim
to verify in proportion to stakes — a fourteen-file change to request handling is
load-bearing.

**Diff the changes.** Thirteen handler files changed, not fourteen: the webhook handler is
untouched. One file outside the delegate's ownership was edited — a shared error utility.
A search for the old callback signature finds the one remaining handler.

**Run the narrowest test yourself.** The default test command passes — and skips the
webhook and payment suites, which run only under a tag. "Tests pass" was true and
meaningless. Under the tag: two failures in the migrated payment handler, both an
unawaited promise that returns before the charge settles.

**Fan in.** Revert the out-of-ownership edit to the shared utility. Continue the same
delegate (its context is still valuable) with a changed packet: the missing handler by
name, the two failing test names, the tagged command to run, and the ownership line
restated. On its second report: diff again, run the tagged suite again, run the full suite
once — green.

**DELIVER (in the controller's voice).** "Fourteen handlers migrated. I verified: diff
covers all fourteen and nothing else; tagged payment and webhook suites pass; full suite
passes. The delegate's first report was incomplete — one handler missed, one out-of-scope
edit reverted, two real failures hidden behind a test tag — all fixed and re-verified.
Relayed, not verified: the delegate's note that the callback helper can now be deleted; I
left it in place."

---

## What the runs share

The protocol paid for itself at the same joints each time. In Example 0 the Floor alone —
goal end-state, follow-through, leftover details — did all the work before any move ran.
In the other three: one literal look at primary evidence killed an inherited frame
(Move 2); a second hypothesis plus one discriminating check replaced pattern-matching
(Move 3); one cheap kill-test either hardened or corrected the conclusion before it
shipped (Move 4); and the delivery led with the verdict, typed its claims, and named its
weakest link (Move 5). None of it required a smarter model — only a model that refuses to
skip the looking.

Examples 4–6 add the playbook joints: the symptom's fix was refused until the mechanism
was confirmed by prediction and the class was guarded; the proposed solution was refused
until criteria existed and cheaper options had been measured; the delegate's report was
refused as evidence until the diff and the tagged tests had been observed by the
controller.
