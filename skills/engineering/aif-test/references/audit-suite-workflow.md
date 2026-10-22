# Suite Audit Workflow (`audit`)

Find tests that fail to establish the intended contract. LLM-authored code often optimizes for "done"
at any cost, so suites accumulate tests written only to pass, disabled tests,
unfinished tests, and stubs that assert nothing. The audit restores the suite's evidential value.

## 1. Inspect the affected suite

Inspect directly for a bounded suite. For independent large areas, optional scouts can divide:

- test files per area (unit/integration/e2e/UI);
- CI workflow files, including selection/skip logic and ignored lanes;
- git history of test files (when tests were weakened, skipped, or deleted —
  `git log -p` over test paths).

## 2. Detection targets

Hunt for each class with concrete evidence (file:line):

- **Deceptive tests** — tests written only to pass: tautological asserts
  (`expect(true)`), asserting the mock instead of the behavior, snapshotting
  whatever the code currently does, catching and swallowing the failure,
  over-broad mocks that bypass the code under test.
- **Disabled tests** — commented-out or skipped tests (`skip`, `todo`, `xit`,
  `t.Skip`, `@pytest.mark.skip`) without a linked reason or issue.
- **Unfinished tests** — empty bodies, `TODO: implement`, setup without
  assertions, placeholders left "for later".
- **Ineffective tests** — pass with the bug present (spot-check by mutating
  the code under test and watching for a failure), assert implementation
  details instead of contracts, or fail to protect their claimed behavior.
- **Missing edge cases** — boundaries, empty/null inputs, concurrency,
  error paths, permission failures on covered features.
- **Potentially redundant tests** — overlapping tests whose contract may already be
  protected more cheaply. Use `test-lifecycle.md`; unchanged line coverage or
  sampled mutation kills alone cannot prove safe deletion.
- **Outdated tests** — tests locked to removed features, renamed APIs, or
  contracts the current code no longer has.
- **Security gaps in tests** — hardcoded real credentials or tokens in
  fixtures, tests that print secrets, missing security coverage for authz/authn
  failure paths, injection-shaped inputs never exercised.
- **CI blind spots** — lanes that never run, always-green jobs with masked
  exit codes (`|| true`), result files ignored by the gate.

## 3. Rank and decide

Rank by risk and measured cost: **Critical** for hidden critical regressions or
secret exposure; **Important** for outdated contracts, meaningful protection gaps or expensive
duplication; **Minor** for low-impact maintenance. Record the contract, evidence,
proposed repair, remaining protection and repair risk. Include per-test timing
when available; no timing means unknown cost, not a reason to guess savings.

## 4. Report, or apply authorized repairs

Audit is report-only by default. The following repair steps apply only when the user also requests fixes.

- With `--interview`: present the ranked change list and interview the user per
  group before applying; apply only approved repairs. Otherwise apply already-authorized repairs directly
  and report everything.
- Rewrite deceptive/ineffective tests to assert the observable contract; each
  repaired test must fail when its target bug is reintroduced.
- Re-enable disabled tests by fixing the underlying cause — never delete a
  skip marker without making the test genuinely pass.
- Add confirmed missing cases; combine, lower the layer or retire only with the
  lifecycle review and authorization above. Check the remaining suite jointly,
  then rerun the same valid sampled faults and affected contracts.
- Remove real secrets from fixtures; replace with synthetic values.
- Run affected tests and required gates after repairs. Preserve observed failures
  and skip reasons; an unavailable mandatory check means insufficient evidence.

## 5. Report

Per `references/report-format.md`: findings by class and severity with
evidence, repairs applied vs proposed (and why), protection and measured costs
before/after, untested gaps and unresolved questions last. Hand measured execution
opportunities to optimize without turning report-only audit into edit authority.
