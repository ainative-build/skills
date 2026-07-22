# Base checklist (all project types)

Concrete patterns to scan for on every review. Two passes: **blocking** (must fix) and
**non-blocking** (should fix). Cite `file:line`, give evidence, suggest a fix. Skip anything that's
fine — flag only real problems.

Routing to axes: **security/injection/auth/race** items feed the **Adversarial** axis;
**quality/perf/test-gap/dead-code** items feed the **Standards** axis. Apply the matching overlay
(`api.md`, `web-app.md`) when its detection triggers.

## Pass 1 — blocking

### Injection & data safety
- String interpolation into SQL / DB queries (even with casts) — must be parameterized.
- Unsanitized user input written to DB or rendered as HTML (`innerHTML`, `dangerouslySetInnerHTML`, `| safe`, `raw()`).
- Command injection via string concatenation in shell calls (use argument arrays).
- Path traversal via user input in file operations.

### Race conditions & concurrency
- Read-check-write without atomicity (check-then-set must be atomic: `WHERE old + UPDATE`).
- Find-or-create without a unique constraint (concurrent calls duplicate).
- Status transitions without atomic guard on the prior state.
- Shared mutable state without synchronization.

### Security boundaries & auth
- New endpoint/route without an authentication check.
- Authenticated-but-not-authorized: missing ownership/permission check (IDOR — user reaches another user's data).
- Admin-only operation reachable by a regular user.
- Secrets in logs, error responses, or client-side code.
- Token/JWT compared with `==` instead of constant-time comparison.
- LLM/AI output written to DB or used in a query without validation.

## Pass 2 — non-blocking

### Conditional side effects
- A branch sets one thing but forgets the paired side effect on another branch.
- A log claims an action happened that was conditionally skipped.

### Coupling & dead code
- Bare numeric/string literals duplicated across files — name them.
- Error-message strings reused as query filters elsewhere (grep the string).
- Variables assigned but never read; unused imports; stale comments describing old behavior.

### Test gaps
- Missing negative-path tests (validation failures, error cases).
- Assertions on type/status but not the side effect (checks status, not that the email sent).
- Missing integration tests for security enforcement (auth, rate-limit, access control).

### Type coercion at boundaries
- Values crossing language/system boundaries where the type can silently change (string vs number).
- Hash/serialize inputs not normalized before use.

### Performance
- O(n·m) lookups in a loop (array search inside a loop — use a map).
- List endpoints/queries without pagination or `LIMIT` (unbounded results).
- N+1: association loads inside a loop without eager loading.

## Suppressions — do NOT flag

Same list as the persona's suppressions. In short: no style/formatting, no redundancy-for-
readability, no "consider X instead of Y" when Y works, no consistency-only churn, no comment-rot
requests, and nothing already handled in the diff. Read the FULL diff before flagging.
