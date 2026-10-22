# Test Failure Fix Workflow

For fixing failing tests and test-suite regressions.

## Progress Tracking

The stages are `collect failures → diagnose → plan → implement → retest →
review`. Discover the live task-management surface and mirror this dependency
chain when available. Otherwise, update the active plan. Plan files are the
durable source of truth.

## Workflow

### Step 1: Compile and Collect Failures

Use the aif-tester agent. Fix syntax or compilation errors before running behavior
tests. Run the relevant suite, collect every failure, and group failures by
module or likely shared cause.

### Step 2: Debug

Use the aif-debugger agent. Analyze each failure group and prove shared root causes
before modifying code.

### Step 3: Plan

Use the aif-planner agent. Prioritize shared root causes first and record
dependencies between fixes.

### Step 4: Implement

Implement fixes in dependency order and keep changes cause-aligned.

### Step 5: Retest

Use the aif-tester agent. Start with the narrow failing test, then broaden across
the blast radius. If tests still fail, return to Step 2.

Under `--advice`, a failed check is an objective `aif-oracle` trigger: STOP and spawn `aif-oracle` with the command, its output, and what you tried before re-diagnosing; never self-reason past a red check.

### Step 6: Review

Use the aif-code-reviewer agent and retain fresh test evidence.

## Common Commands

```bash
npm test
bun test
pytest
go test ./...
```

## Tips

- Run one failing test first for faster iteration
- Compare assertions with intended behavior
- Verify fixtures and mocks represent real contracts
- Change a test only when evidence proves the test is wrong
