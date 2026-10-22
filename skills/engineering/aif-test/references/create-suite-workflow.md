# Suite Creation Workflow (`create`)

Create a test suite that covers the project's features and workflows, grounded
in what the code and docs actually do — never in guessed behavior.

## Test-first scope (called by aif-serve)

When `aif-serve` calls `create` for one phase or task before implementing it:

- The authority is the phase's Tests First section and acceptance criteria, or the task's
  acceptance criteria when there is no plan. Do not infer expectations from code that does not exist yet.
- Scope the scout to the files the phase touches and their existing tests; skip the project-wide matrix.
- Write tests only. Never write or change production code in this mode.
- Run the new tests and report them red: each new-behavior test must fail on an assertion about
  the missing behavior, and each characterization test must pass. Fix any test that fails on an
  import, setup or syntax error, or that already passes, before handing back.
- Hand back the test files, the red output and the green command for `aif-serve` to run.

## 1. Scout the codebase and docs

Inspect the requested scope directly; use installed `aif-recon` for larger
independent areas only when its cost is justified. Inspect:

- entry points, public APIs, exported modules, CLI commands, HTTP routes;
- business workflows described in `docs/` and the README;
- existing tests (framework, layout, helpers, fixtures, naming conventions);
- configuration and environment surfaces that change behavior;
- error paths and boundary conditions visible in the code.

Output: a scout report listing features, workflows, and their owning files.

## 2. Build the coverage matrix

Map affected features/workflows to their intended coverage. Bootstrap the whole
project only when that is the requested scope:

| Feature / workflow | Owner files | Level (unit/integration/e2e) | Exists? | Priority |
| --- | --- | --- | --- | --- |

Rules:

- Prefer the lowest level that can prove the behavior (unit > integration > e2e).
- Every critical path gets happy-path AND error-path coverage.
- Reuse the project's existing framework and conventions — never introduce a
  second test framework beside a working one.
- Skip trivial plumbing (getters, pass-throughs); test behavior, boundaries,
  invariants, transitions, and real error handling.

## 3. Design before writing

For each matrix row without coverage, define: the observable contract under
test, the failure a plausible bug would cause, fixtures needed, and isolation
requirements (no cross-test dependencies, deterministic, full-suite-safe).
Use `test-lifecycle.md` for admission and proof of value. Reuse adequate existing
tests; an empty addition list is valid when no protection gap remains.

With `--interview`: present the matrix and the planned test list; interview the
user per group before writing. With `--pro-max`: fan this design step per the
skill's Pro-Max Verifier Mode. With `--chef`: checkpoint the matrix with
`aif-chef` before implementation.

## 4. Implement

- Write tests group by group; run each group as it lands.
- Demonstrate the intended failure using a pre-fix reproduction or bounded,
  isolated fault injection where safe and practical. Report unavailable proof.
- Wire coverage tooling when the project already defines it; target the
  project's threshold. Without one, report coverage and critical behavior gaps
  without inventing a percentage gate.
- Never write a test that asserts nothing, mirrors the implementation line by
  line, or locks in buggy behavior to pass.

## 5. Verify and report

- Run new/affected tests, then repository-required gates. Run a broader suite
  when shared infrastructure or policy requires it, not after every small edit.
- Report per `references/report-format.md`: matrix coverage before/after,
  tests added per level, gaps intentionally left (with reasons), and unresolved
  questions last.
