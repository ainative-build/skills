# Debugging and Root Cause — investigate to the mechanism, fix it completely, prevent recurrence

A bug is fixed when the mechanism that produced it can no longer produce it — not when the
symptom stops. Fable's debugging discipline: reproduce, run a differential diagnosis, build
a causal chain with every link observed, fix at the altitude of the cause, prove the fix
both ways, and make the class of bug impossible or loud. `references/coding-taste.md`
covers the code-change procedure; this reference goes deep on the investigation and the
prevention. The installed debug skill and `aif-fix` provide runtime workflows; this is the
reasoning layer they run on.

## When to load this reference

Load for any failing test, error, crash, wrong output, flaky behavior, performance
regression, or incident; any "it worked yesterday"; any recurring bug; and every "quick
fix" request — quick fixes are where symptom patches live.

## Know Your Own Defaults (debugging failure modes)

- **Symptom patching** — the null check, the retry, the try-catch, the sleep. The
  mechanism is still there.
- **Resemblance diagnosis** — "classic X" from the error text. Same symptom, different
  cause.
- **Single-hypothesis tunnel** — investigating the favorite; evidence read to confirm it.
- **Fix by flailing** — changing things until green, with no model of why.
- **Correlation as cause** — "it broke after the deploy", when the nightly job coincided.
- **Stopping at the first cause** — the line that threw, not why the value was wrong, not
  why the invariant could be violated, not why nothing caught it.
- **Non-reproduction** — fixing what was never reproduced, then declaring victory on the
  absence of evidence.
- **Environment blindness** — local, CI, and production differ in time zone, locale,
  concurrency, data shape, versions, caches.
- **Fix without a test** — the regression returns silently.
- **Prevention skipped** — the same class of bug reappears in the neighboring code.

## How to think (the moves, in debugging order)

1. **FRAME expected versus actual, precisely.** What should happen, what happens, since
   when, where (environment), how often, with what blast radius. The goal is the
   mechanism removed and proven — never merely "the test passes".
2. **Reproduce first.** A minimal, deterministic reproduction: a failing test, a command,
   an input. Shrink it — remove pieces until it stops failing; the last piece removed is a
   clue. If it will not reproduce, collect ground (logs, traces, timestamps, versions,
   data) until it does; for flaky behavior, loop it many times, stress it, vary timing
   and concurrency, and characterize the failure rate. Do not fix what you cannot observe.
3. **Read the evidence literally.** Exact error text, stack, line, and values. Build the
   timeline: what changed — code, dependencies, configuration, data, infrastructure, and
   time itself (daylight saving, month end, certificate expiry, cache expiry). Read the
   first error, not the last.
4. **Differential diagnosis.** At least two hypotheses, each with a mechanism chain from
   symptom back to cause and the observation that distinguishes them. Pick the check that
   splits the set, not the one that confirms the favorite; cheapest discriminating check
   first.
5. **Localize systematically.** Bisect commits, inputs, configuration, or time; probe the
   pipeline stage by stage; isolate the layer (network, data, logic, rendering); diff the
   working case against the broken one (environment, request, data). One variable at a
   time; record every experiment and its result.
6. **Follow the chain to the root.** Ask why with evidence at each step: the thrown error
   ← the bad value ← how it got there ← why the invariant was violable ← why nothing
   caught it. Stop at a cause you can change whose removal prevents the whole class, not
   only this instance. Separate root cause, contributing causes, and trigger.
7. **Confirm the cause before fixing.** Predict: "if this is the cause, X happens when I
   do Y" — then do Y. The strongest confirmation makes the bug appear and disappear on
   demand by toggling the cause. A cause that predicts nothing is still a hypothesis.
8. **Fix at the altitude of the cause.** Design fault → design fix; violable invariant →
   enforce it at the boundary (types, validation, constraints); mechanical → mechanical.
   Smallest complete fix with the invariant ledger; no unrelated cleanup. Search for
   every instance of the pattern and fix or file each, not only the one that fired.
9. **Prove the fix.** The reproduction now passes; the regression test fails without the
   fix and passes with it (run both ways); neighbors and the whole artifact re-verified;
   the fix does not mask — errors still surface where they should.
10. **Prevent recurrence — make the class impossible or loud.** A type, schema, or
    constraint that rejects the bad state; a lint rule or test that catches the pattern;
    an assertion at the boundary; monitoring or an alert on the symptom; removal of the
    footgun API; a code comment stating the invariant (never a ticket number); a runbook
    or postmortem for incidents (timeline, cause, contributing factors, actions with
    owners). Ask "where else can this happen?" and answer with a search.
11. **Deliver:** the cause as a mechanism, the evidence, the fix, the proof, the
    prevention, what remains uncertain, and the residual recurrence risk.

## Investigation toolkit (first moves by symptom)

| Symptom | First moves |
|---------|-------------|
| Deterministic failure | minimal reproduction → literal read → bisect |
| Flaky or intermittent | loop and stress → timing, ordering, concurrency → shared state → environment differences |
| Works locally, fails in CI | diff the environment: OS, time zone, locale, versions, parallelism, paths, cwd, secrets, caches |
| Performance regression | measure first (profile), bisect commits and config, check data growth, N+1 queries, lock contention |
| Wrong output or corrupted data | trace one record end to end through every transform; time zone, encoding, floating point |
| "Nothing changed" | something did: dependencies, certificates, data, clock, quotas, upstream; check timestamps |
| Disappears under observation | logging shifted the timing → sample, record, replay; suspect a race |

## What good debugging is (evaluable, not vibes)

- **Reproduced** — a deterministic reproduction exists, or flakiness is characterized
  with numbers.
- **Mechanistic** — a causal chain with every link observed, symptom to root.
- **Discriminated** — two or more hypotheses; the survivor confirmed by prediction.
- **Root-level** — the fix removes the class at the altitude of the cause.
- **Proven** — the regression test fails without and passes with; the whole artifact is
  green.
- **Guarded** — at least one prevention that would catch the next instance earlier.

## What to avoid (the slop catalog — matches are failed gates)

- A swallowing try-catch, an early return on null, a retry loop, or a sleep as the fix.
- "Probably a race condition" without a trace.
- A version bump and move on.
- "Fixed" with no test that fails without the fix.
- A cause described as "the code was wrong".
- Root cause equals the line that threw.
- A flaky test marked skip or wrapped in retries.

## Details models habitually miss

- The first error in the log, not the last; the warning that preceded the error.
- Time: daylight saving, time zones, month and year boundaries, leap days, clock skew,
  certificate and cache expiry.
- Encoding, locale, line endings, path separators, case sensitivity.
- Concurrency: shared state, ordering, idempotency, retries duplicating side effects.
- Data shape drift: nulls, empties, unicode, huge inputs, duplicates, negatives.
- Stale builds, dependencies, and caches: a fix that "works" because of a stale artifact.
- Multiple causes: fixing one hides the second until later.
- Regressions from the fix itself: run the suite, not only the test.

## Verify (the loop)

1. The reproduction fails before the fix and passes after it.
2. The regression test toggles with the fix.
3. The cause is confirmed by prediction — toggled on and off.
4. Sibling instances searched; each fixed or filed.
5. The whole suite or artifact re-verified; no masked errors.
6. The prevention is in place and itself verified: the lint fires, the alert tests, the
   constraint rejects.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Reproduction | deterministic repro, or flakiness quantified | command and result |
| Mechanism | chain from symptom to root, each link observed | causal chain notes |
| Discrimination | two or more hypotheses; survivor confirmed by prediction | hypothesis log |
| Altitude | fix removes the class, not the instance | fix rationale, sibling search |
| Proof | test fails without, passes with; suite green | both runs recorded |
| Prevention | a guard that catches the next instance earlier | guard verified |

## Root-cause record template

```text
Symptom: ... (environment, since, frequency, blast radius)
Reproduction: <command or test> -> <result>
Hypotheses: H1 ... (check: ...); H2 ... (check: ...)
Evidence: literal errors, bisect result, toggle test
Root cause: <mechanism: symptom <- ... <- cause>; contributing: ...; trigger: ...
Fix: <altitude>, <files>; ledger: preserves / breaks / risks
Proof: test fails without / passes with; suite green
Prevention: <type, constraint, lint, alert, comment, runbook>; siblings: <found n, fixed / filed>
Open: ...
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Patch the symptom | Remove the mechanism at the altitude of the cause |
| Diagnose from the error's resemblance | Two hypotheses; the discriminating check first |
| Fix what you never reproduced | Reproduce or characterize before touching code |
| Stop at the line that threw | Follow the chain to the violable invariant and the missing guard |
| Declare fixed when the test passes | Prove both ways; run the suite; search for siblings |
| Ship without prevention | Add the type, constraint, lint, alert, or comment that catches the next one |
| Mark the flaky test as retry | Loop it, find the shared state or race, fix it |
