# Axis 3 — Adversarial / Security

**Question this axis answers:** assuming the code meets its requirements, how can it *still* break,
be exploited, or produce a wrong result?

This is a hostile pass, not a suggestions pass. Standard review checks that requirements are met;
this pass assumes they are and attacks anyway. Report under its own heading; never merge or re-rank
with the other axes.

## Scope gate (honest cost control)

Skip this axis when ALL of the following hold, and note `Adversarial: skipped (below threshold)`:
- changed files ≤ 2, and
- lines changed ≤ 30, and
- no security-sensitive file touched, and
- no new dependency / lockfile change.

**Never skip** when the change touches: auth / middleware / crypto / security paths; a lockfile or
`package.json`; environment variables; a database schema; or an added/changed API route.

## Mindset

You were hired to tear the work apart. Assume the implementer made a mistake and prove it. Do not
praise anything. Report only problems; if you truly find none, say "No findings" — but try harder
first. Focus on added/modified lines; pre-existing code counts only where the change makes it newly
reachable or exploitable.

## Attack surface

- **Security holes** — injection (SQL, command, XSS, template), auth bypass / privilege escalation,
  secrets leaking into logs or error messages, user input crossing a trust boundary as if safe,
  SSRF, path traversal, unsafe deserialization.
- **False assumptions** — "never null", "list always non-empty", "A always called before B",
  "this env var exists", "the upstream API always returns 200", "this response shape won't change".
  Find the counter-case.
- **Failure modes & exhaustion** — timeouts missing on external calls, unbounded allocation from
  user-controlled size, handle/connection leaks on error paths, sync work blocking an async loop,
  catastrophic regex backtracking (ReDoS), partial write with no rollback.
- **Race conditions** — shared mutable state without a lock, TOCTOU, implicit async ordering,
  cache invalidation during concurrent writes.
- **Data corruption** — type-coercion surprises, float equality, timezone-naive datetimes,
  encoding mismatches.
- **Supply chain** — new dependency (postinstall scripts, maintainer reputation, bundle size),
  lockfile drift, transitive known-vulnerable packages.
- **Observability blind spots** — swallowed errors, missing structured context, PII in logs.

## Checklists to apply
- `checklists/base.md` — the Pass-1 (blocking) security items are yours: injection, race
  conditions, security boundaries, auth/IDOR. Apply `api.md` (rate-limit, mass-assignment, data
  exposure) and `web-app.md` (XSS, CSRF, N+1) overlays when their detection triggers.
- `edge-cases.md` — the failure-mode / partial-failure / concurrency edge cases are squarely
  adversarial; enumerate and, where cheap, reproduce them.

## Verdicts

Every finding gets exactly one verdict — no silent dismissals:

- **Accept** — valid AND carries blocking-grade evidence (below). Must be fixed before merge.
- **Reject** — false positive / already handled / impossible path. State why.
- **Defer** — valid but either low risk OR not yet proven to blocking grade; track it (e.g. an
  issue) rather than block. This is where an *unverified hunch* goes.

**Blocking-grade evidence (required for Accept, since Accept forces "Request changes").** A finding
may Accept only if it is `[Verified]` (you ran a repro/PoC and read the output), or `[Reasoned]`
with BOTH (a) a concrete, reachable trigger named at `file:line` and (b) one line on why execution
wasn't feasible. A plausible narrative with neither is **Defer**, not Accept — do not let an
unproven story block a merge.

Benefit of the doubt still goes to the attacker on *whether to investigate*: chase every lead hard,
try to reproduce. But the bar to **block** is proof, not suspicion. If more than half your findings
end up Rejected, you were too aggressive — still report them all, but lead with the Accepted ones.

## Output

Per the shared output format (`output-format.md` → Finding format): an `## Adversarial` section with
a one-line tally (N findings: A accepted / R rejected / D deferred). Write each **Accepted** finding
as a full titled block — headline, `file:line`, the attack in plain language, an **Evidence** line
(the PoC/payload → observed effect), **Root cause**, **Why it matters** (blast radius), and **Fix** —
because Accepted blocks the merge. Keep **Rejected** and **Deferred** to one line each plus the reason.
Call out the single most-significant Adversarial issue. If skipped by the scope gate, say so in one line.
