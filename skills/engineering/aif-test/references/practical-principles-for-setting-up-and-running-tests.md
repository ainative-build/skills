# Practical Principles for Setting Up and Running Tests

## 1. Test What Your System Owns

Focus on application behavior, business rules, and integration contracts. Do
not exhaustively retest guarantees already provided by the language, framework,
database, or dependencies. Test how your system configures, uses, and handles
failures around them.

## 2. Scope Tests by Risk

Use the smallest test that can reliably prove the invariant. Cover realistic
happy paths, failure paths, and meaningful edge cases. Avoid duplicated
coverage and unnecessary combinatorial matrices.

## 3. Test at the Lowest Reliable Layer

- Unit tests: Pure logic without external infrastructure.
- Integration tests: Database, HTTP, messaging, and module contracts.
- E2E tests: Critical user journeys that lower layers cannot fully prove.

Lower-level tests are usually faster, cheaper, and more stable.

## 4. Isolate Test Environments

Keep development and test data, databases, and credentials separate.
Destructive tests need safeguards against targeting development or production.
Test environments should be reproducible, resettable, and easy to verify.

## 5. Run Sequentially by Default

Use one worker for local runs unless parallelism is necessary and proven safe.
Parallel execution should be intentional—not a random way to expose bugs.

## 6. Run Expensive Tests with a Purpose

Do not automatically run broad E2E, browser, race, load, stress, soak,
benchmark, or memory-pressure tests. Use them only when there is:

- A specific investigation;
- A measured regression;
- A clear acceptance threshold;
- Or a relevant concurrency or performance change.

## 7. Keep Concurrency Tests Deterministic

Test only application-owned invariants such as idempotency, locking,
uniqueness, authorization revocation, lease ownership, or atomic transactions.
Prefer one small scenario with explicit synchronization over stress loops,
random scheduling, or repeated sleeps.

## 8. Never Game the Green Build

Do not ignore failures, weaken assertions, delete tests, or add workarounds just
to pass CI. Test doubles are valid at appropriate boundaries, but they must not
replace integrations that require real verification.

## 9. Investigate Failures with Evidence

When a test fails:

1. Identify whether the cause is code, test logic, fixtures, environment, or a
   dependency.
2. Reproduce it with the smallest relevant test.
3. Fix the root cause.
4. Rerun the failed test.
5. Run nearby tests within the affected area.

Avoid repeatedly running the entire suite before understanding the failure.

## 10. Test the Final Code

Compile or type-check after changes. Run tests after refactoring and
simplification, then review the tested version. Before pushing, all relevant
lint, build, and test gates must pass.

“All tests pass” means every test within the selected risk scope and release
gates passes—not that every test in the repository must always run. Any
observed failure must still be investigated and documented.

## 11. Keep Tests and Specifications in Sync

When behavior, API contracts, permissions, or user flows change, update tests
and acceptance scenarios together. Specifications without tests drift; tests
without specifications lose intent.
