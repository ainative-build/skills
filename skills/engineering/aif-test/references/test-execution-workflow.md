# Test Execution Workflow

## Step 1: Identify Scope

Determine what to test based on recent changes:
- New feature → affected behavior and new acceptance cases; broaden for shared contracts
- Bug fix → regression tests + targeted fix validation
- Refactor → existing test suite (no new tests unless gaps found)
- Coverage check → full suite with coverage flags

The risk-scope and lowest-reliable-layer rules in
`practical-principles-for-setting-up-and-running-tests.md` govern this list.
Resolve the accepted contract and its authority before choosing checks. Use native
deterministic mappings and preserve mandatory groups/full-suite fallback. AI advice
cannot suppress checks. Read `test-lifecycle.md` only if adding/changing tests or
assessing whether an existing test should remain.

## Step 2: Pre-flight Checks

Start with the smallest check that can establish the affected contract. Use these syntax/type examples when relevant; do not run every command. Reuse passing evidence only when revision, configuration and environment assumptions remain unchanged:

Discover repository-authoritative commands first; examples below do not authorize
package downloads or replacing configured runners. Record changed/dirty/untracked
inputs and a source fingerprint before and after execution. A commit SHA alone
does not identify a modified worktree. If freshness cannot be established, report
the tested state and gap; do not certify the final source from stale output.

Reuse an owned running service when compatible. Bound execution, retries and
workers; track started process IDs, ports, containers and temporary roots. Store
each attempt's output separately and clean up only resources this run owns.

```bash
# JavaScript/TypeScript
npx tsc --noEmit          # TypeScript check
npx eslint .              # Lint check

# Python
python -m py_compile file.py
flake8 .

# Flutter
flutter analyze

# Go
go vet ./...

# Rust
cargo check
```

## Step 3: Execute Tests

### JavaScript/TypeScript
```bash
npm test                    # or yarn test / pnpm test / bun test
npm run test:coverage       # with coverage
npx vitest run              # Vitest
npx jest --coverage         # Jest with coverage
```

### Python
```bash
pytest                      # basic
pytest --cov=src --cov-report=term-missing  # with coverage
python -m unittest discover # unittest
```

### Go / Rust / Flutter
```bash
go test ./... -cover        # Go with coverage
cargo test                  # Rust
flutter test --coverage     # Flutter
```

## Step 4: Analyze Results

Focus on:
1. **Failing tests** — read error messages and stack traces carefully
2. **Flaky tests** — tests that pass/fail intermittently indicate race conditions or state leaks
3. **Slow tests** — compare measured cost against their contract and existing baseline
4. **Skipped tests** — ensure skips are intentional, not hiding failures

## Step 5: Coverage Analysis

Thresholds:
- Use repository-defined line/branch thresholds when present.
- If no threshold exists, report actual coverage and missing critical behaviors; do not invent a percentage gate.
- Focus on critical paths: auth, payment, data mutations

Identify gaps:
- Uncovered error handlers
- Missing edge case branches
- Untested utility functions

## Step 6: Build Verification

```bash
npm run build               # JS/TS production build
python setup.py build       # Python
go build ./...              # Go
cargo build --release       # Rust
flutter build               # Flutter
```

Check for:
- Build warnings or deprecation notices
- Unresolved dependencies
- Production config correctness

## Completion

Use `report-format.md` to report achieved scope and outstanding evidence. A skipped
mandatory check is not a pass. Preserve raw failure/exit codes and distinguish
product, expectation, fixture, provider and tooling failures. Retries do not erase
the first failure. Verify owned-resource cleanup on success, failure or timeout;
report interrupted/unverified cleanup without killing another session's processes.
