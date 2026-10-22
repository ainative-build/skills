# Test value and lifecycle

Use this when changing a suite or proposing retention/retirement. The shared
practical principles remain the authority for scope, layer and execution. Aim to
reduce total delivery work without losing protection, not to minimize test count.

## Establish the contract

For each affected behavior, record briefly:

| Field | Question |
| --- | --- |
| Contract and authority | What must be true, according to which accepted requirement/API/spec? |
| Risk and policy | Which data, authorization, business or release boundary matters? |
| Check | Which existing test or targeted probe observes the output/state/side effect? |
| Gap | What plausible defect remains unprotected, and why add another test? |
| Evidence | What actually ran, on which source and environment, with what result? |

An AI-inferred expectation is a hypothesis until checked against valid authority.
Properties need an input domain and meaningful invariant; combine examples and
properties where each protects a different failure. Do not equate structural
coverage with correct business behavior.

## Admit and retain

- Prefer an existing test that already catches the target defect. A covered
  refactor or policy-eligible docs change may add zero tests.
- A new test names the defect it would catch and observes production behavior,
  rather than reproducing implementation logic or asserting only mock setup.
- For a bugfix, reproduce the target failure before the fix and pass after it.
  For a refactor, compare preserved behavior. For a new feature or intentional
  change, use the approved new expectation; parent/head difference alone is not a bug.
- Demonstrate failure for the intended defect where safe and practical. If this
  cannot be observed, report that gap, not a fabricated red/green result.
- Keep durable tests for critical contracts, confirmed regressions and useful,
  inexpensive protection. A one-off change probe may remain outside the committed
  suite if its reproducible evidence is retained under project policy.
- A replay plan stores actions to execute again; it never stores a reusable pass.
  Keep specification, replay instructions and observed execution evidence distinct.

## Bounded proof of value

Use mutation selectively in create/audit or an authorized retirement proposal,
not on every ordinary execution and not as a new CI requirement. Prefer an
already-installed project tool. Otherwise use a few justified fault injections
in an owned disposable copy, with an explicit count/time budget. Do not install
tools implicitly or mutate the user's active worktree.

Capture source identity before injection; restore the owned copy exactly and
verify it afterward, including on failure. Bound worker count, retries, generated
harness work and model calls. Stop at the budget and report untested hypotheses.

For each injected defect, distinguish killed, survived, equivalent/unreachable,
invalid and inconclusive. Compilation/setup/provider failures are not kills.
Verify failure came from the target assertion, then rerun restored behavior.
Survivors suggest gaps; validate reachability and the expected behavior before
writing a test. Do not count equivalent mutants as missing protection.

A test's observed kill-set is the set of sampled faults it detects. An empty set
or one contained in a cheaper test's set is only a review candidate. The sample
does not prove equivalence across contracts, tenants, data domains or future faults.

## Combine, lower the layer, or retire

Record the protected contract, criticality, regression history, observed faults,
timing/setup cost and remaining protection for each proposed change. Coverage
diffs, age, rare failures or sampled kill-set overlap alone never justify deletion.

Inspect the remaining suite as a whole: do not delete both tests because each
looks redundant with the other. A lower-layer replacement must preserve the
integration/interaction guarantee; pure logic can move down, a broken UI control
still needs a check of that control. Preserve repository-required tests and gates.

Audit alone reports proposals. Optimize can improve execution within its scope;
suite retirement requires authorized suite repair and this proof-of-value review.
Use existing authorization rather than adding routine approval prompts.

After an authorized change, rerun affected contracts and the same valid sampled
faults against the remaining suite, followed by policy-required gates. A lost
critical contract or missed known regression rejects the optimization even when
time falls. Do not repair the comparison by weakening its expectations.

## Measure the whole cost

Use existing runner timing by test where available, including shared setup costs.
Rank opportunities by protected behavior and measured cost, not a universal
kill-count/time score. First remove repeated setup/execution, then consider suite
changes justified above. Keep unique critical protection even when expensive.

Compare matched source tasks, environment, toolchain and cold/warm conditions.
Include planning/test generation, runner duration/calls, CPU or peak memory when
available, model calls/tokens, retries, replay/live/handoff, false positives,
missed known/seeded regressions and human review effort. Count evaluation overhead
separately. Elapsed time is not billed CI minutes; missing metrics stay unknown.

Use `report-format.md` for the compact result. A bounded fixture comparison
establishes observed behavior on those cases, not production safety or savings.
