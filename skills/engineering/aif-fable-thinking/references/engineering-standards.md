# Engineering Standards — the judgment behind coding and system design

Standards are the criteria a change is judged against before anyone runs it. Models
produce code that compiles and passes the test in front of it and still fails the
standards a senior engineer holds without thinking: the wrong boundary, a leaked
abstraction, an unhandled failure mode, a design nobody can operate. This reference states
those standards evaluably, for code and for systems, so the Self-Review Gate has something
concrete to check. `references/coding-taste.md` is the procedure for one change;
`references/solution-exploration.md` chooses between designs; this is the bar both are
measured against. A repository's own documented standards outrank everything here.

## When to load this reference

Load before writing or reviewing code beyond a trivial edit; before or during any design
(module, service, schema, API, pipeline, infrastructure); for "is this good?", "how should
this be structured?", or a design review; and whenever a repository states no standards of
its own — these are then the default.

## Know Your Own Defaults (engineering failure modes)

- **Premature abstraction** — a helper, interface, or plugin system for one caller.
- **Pattern cargo-culting** — repositories, event buses, microservices, dependency
  injection containers because "best practice", not because a force demanded them.
- **Boundary blur** — business logic in handlers, I/O in domain code, SQL in the view.
- **Happy-path design** — no failure modes enumerated; timeouts, retries, idempotency,
  back-pressure absent.
- **Implicit contracts** — behavior callers depend on that nothing documents or tests.
- **Resume-driven design** — the interesting technology over the adequate one.
- **Local optimum** — the module is clean; the system it sits in got worse.
- **Operability afterthought** — no logs, metrics, health checks, migrations, rollback.

## Engineering principles (each with the tension it carries)

- **Simplicity first.** The simplest design that meets the stated requirements, with
  room to change. Complexity must buy a named requirement.
- **Build for today's requirements.** Leave seams, not features. Tension: irreversible
  decisions (schemas, public APIs, data formats) deserve forward thought; reversible ones
  do not.
- **Don't repeat knowledge, not text.** Duplicate lines are fine; a duplicated decision
  (the same rule in two places) is not. Premature deduplication couples unrelated things.
- **Separation of concerns and clear boundaries.** Each module has one reason to change;
  dependencies point inward — domain code does not import I/O; side effects live at the
  edges.
- **High cohesion, low coupling.** A change touches one place; a module can be
  understood alone.
- **Explicit over implicit.** No hidden global state, no magic, no action at a distance;
  behavior is visible at the call site.
- **Fail fast, fail closed.** Validate at boundaries, reject early, default to the safe
  state, never swallow errors.
- **Make illegal states unrepresentable.** Types, enums, constraints, and invariants
  enforced by construction.
- **Idempotency and determinism** wherever retries or replays exist.
- **Least privilege and secure by default** (`references/security-taste.md`).
- **Design for operability.** Observable, deployable, rollback-able, migratable.
- **Reversibility.** Two-way doors decided fast; one-way doors (storage, public
  contracts, data formats) decided deliberately.

## Code standards (evaluable)

- **Naming** says what a thing is or does, in the domain's words; no abbreviations that
  need a key; a boolean reads as a predicate; one vocabulary across the codebase.
- **Functions** do one job at one level of abstraction; short enough to read without
  scrolling; few, typed parameters; no boolean flags that switch behavior — split the
  function.
- **Errors** are handled at the level that can act on them, wrapped with context, never
  swallowed, classified (retryable or fatal, user or system); messages say what happened
  and what to do.
- **Types and contracts:** public surfaces typed and documented; inputs validated at the
  boundary; internal code trusts validated data.
- **State:** minimal mutable shared state; immutability by default; clear ownership.
- **Dependencies:** few, pinned, justified, audited; a third-party API is wrapped only
  when you actually need to swap or fake it.
- **Concurrency:** shared state guarded or eliminated; a timeout wherever something can
  block; cancellation propagated.
- **Tests** form a pyramid — fast unit tests for logic, integration tests at boundaries,
  few end-to-end; they specify behavior, not implementation; each fails for one reason;
  deterministic, no sleeping; realistic minimal data.
- **Comments** explain why and state invariants, never narrate what; no commented-out
  code; no plan or ticket identifiers.
- **Logging and metrics:** structured, leveled, correlation identifiers, no secrets or
  personal data; every log line has a reader.
- **Configuration** comes from the environment or files, is validated at startup, has
  safe defaults; secrets come from a store.
- **Formatting and lint:** the repository's tools decide; zero new warnings.
- **Modularity:** split when a file has several reasons to change, not at a line count;
  names follow the language's convention.

## System design standards (evaluable)

1. **Requirements before shape:** functional; non-functional (latency, throughput,
   availability, durability, consistency, data volume now and in a year); constraints
   (budget, team, compliance); explicit non-goals.
2. **Data model first:** entities, ownership, invariants, lifecycle; one source of truth
   per fact; how it migrates.
3. **Contracts at boundaries:** versioned API shapes; stated compatibility rules; errors
   as part of the contract; idempotency keys on mutating calls.
4. **Failure modes enumerated per dependency** — timeout, error, slow, partial,
   duplicate, out of order — each with its chosen behavior: retry with backoff and jitter,
   circuit-break, degrade, or fail. Limits and back-pressure on every queue and buffer.
5. **Consistency chosen, not assumed:** transactions and isolation levels; optimistic or
   pessimistic concurrency; eventual consistency with a reconciliation path.
   Exactly-once is at-least-once plus idempotency.
6. **State placement:** stateless where possible; state in systems built for it; a cache
   is an optimization with an invalidation story, never a source of truth.
7. **Scale by measurement:** a back-of-envelope capacity estimate, the bottleneck named,
   the first scaling move known; no distributed system for a problem one machine solves.
8. **Security by design:** trust boundaries, authentication and authorization at each,
   secrets, audit (`references/security-taste.md`).
9. **Operability:** health checks, structured logs, metrics, traces, alerts on symptoms;
   deploy, rollback, and migration plans (expand and contract for schemas); feature flags
   on risky paths.
10. **Evolution:** what is easy to change later and what is not; one-way doors named and
    justified; a decision record per `references/engineering-prose.md`.
11. **Cost:** infrastructure and operational cost estimated; within requirements, the
    simpler design wins.

## Design review checklist (ask it of any design, including your own)

- Which requirement does each component satisfy? An unclaimed component is deleted.
- What happens when each dependency is slow, down, or wrong?
- Where is the source of truth for each fact, and who may write it?
- What is the blast radius of a bad deploy, and how is it rolled back?
- What is the migration path, and does it run without downtime?
- Which decisions are one-way doors, and are they justified?
- How will we know it is broken before users do?
- What does ten times the load do? Ten times the data?
- What is the simplest design that would also pass?

## What to avoid (the slop catalog — matches are failed gates)

- Interfaces with one implementation; factories for one product.
- Microservices, event sourcing, or a message bus without the force that needs them.
- Retries without backoff, idempotency, or a cap; absent timeouts.
- A try-catch that logs and continues; errors passed around as strings.
- Boolean flag parameters; functions named after nothing (handle, process, utils).
- A cache as the source of truth; a TTL as the correctness strategy.
- Schema changes without expand and contract; migrations without rollback.
- "Scalable" with no numbers attached.

## Details models habitually miss

- Time: UTC in storage, monotonic clocks for durations, time zones at the edge.
- Money as integers or decimals, never floats, with the currency attached.
- Unicode normalization, collation, and case folding in identifiers and comparisons.
- Pagination, limits, and ordering guarantees on every list endpoint.
- Partial failure in batch operations; replays that must be idempotent.
- Resource cleanup: connections, file handles, temp files, child processes.
- Compatibility of serialized data: unknown fields, optional fields, enum growth.
- Observability of the new path: a metric and a log line before shipping.
- The contract documented at its owning surface, not in a chat message.

## Verify (the loop)

1. Map every component and public function to a requirement; delete orphans.
2. Enumerate failure modes per dependency and per input class; each has a chosen
   behavior in code, not in intent.
3. Lint, typecheck, and tests at zero new warnings; tests specify behavior.
4. Run the design review checklist; each answer points to code, configuration, or a
   decision record.
5. Walk a bad deploy, a tenfold load, and a schema change on paper; a plan exists for
   each.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Necessity | every component buys a named requirement | requirement map |
| Boundaries | dependencies point inward; effects at the edges | import and layer check |
| Failure handling | each dependency's failure modes have chosen behavior | failure-mode table |
| Contracts | public surfaces typed, versioned, tested | contract audit |
| Operability | logs, metrics, health, rollback, migration present | checklist answers |
| Simplicity | no simpler design passes the same requirements | the last checklist question |

## Do / Don't

| Don't | Instead |
|-------|---------|
| Add an abstraction for one caller | Inline it; abstract at the second real caller |
| Adopt a pattern because it is standard | Name the force that demands it, or skip it |
| Design the happy path | Enumerate failure modes per dependency; choose each behavior |
| Retry blindly | Backoff with jitter, a cap, idempotency on the retried call |
| Treat the cache as truth | One source of truth; cache with an invalidation story |
| Change a schema in place | Expand, migrate, contract; rollback at each step |
| Ship without a way to see it fail | A metric, a log line, and an alert on the symptom |
