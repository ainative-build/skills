# Implementation steps

Capture or reuse the opening contract and select the mode in SKILL.md. Inspect only relevant
source, callers, tests and docs. Reuse fresh evidence instead of rerunning an earlier owner.
Research unknowns; create a concise plan or phase files according to coordination/risk.
Only explicit `--interactive` pauses after research, plan, implementation and tests.

## Implement

Follow existing helpers, imports, error handling and public contracts. Reconcile the accepted
plan with current source before edits. Keep phase dependencies and ownership; track state
through available capabilities or the plan files. Check coherent edits, not every keystroke.

### `--tdd` Flag Behavior

When `--tdd` is active, Step 3 splits into sub-steps per phase:

```
Step 3.T: Write tests for CURRENT behavior (regression safety net)
Step 3.I: Implement changes (refactor, new code)
Step 3.V: Verify all tests from 3.T still pass + compile gates
```

Tests from Step 3.T document the current behavior. If any fail after Step 3.I,
the refactor broke something and must be fixed before the workflow proceeds.

Under `--advice`, a broken characterization test here is an objective `aif-oracle` trigger: STOP and spawn `aif-oracle` with the command, its output, and what you tried before re-fixing; never self-reason past a red check.


### Step 3.S: Conditional Simplify (live-diff gated)

Recompute signals from the live worktree (no hook state):

```bash
totals=$(git diff --numstat HEAD --ignore-all-space)
loc=$(echo "$totals" | awk '{s+=$1+$2} END {print s+0}')
files=$(echo "$totals" | awk 'NF{c++} END {print c+0}')
maxFile=$(echo "$totals" | awk 'BEGIN{m=0} {if ($1>m) m=$1} END {print m+0}')
modified=$(git diff --name-only HEAD)
```

The thresholds are 400 changed lines, 8 files and 200 lines in a single file
(`loc`, `files`, `maxFile`). If any threshold is breached, spawn the simplifier
scoped to the modified files:

```
delegate_agent capability(subagent_type="aif-code-simplifier", prompt="Simplify these files while preserving behavior exactly: [file-list]", description="Simplify recent edits")
```

After the subagent returns, log only — never re-run or block:
- `git diff --shortstat HEAD -- [file-list]` changed → "simplifier made scoped edits"
- unchanged → "simplifier ran clean"

Skip the step entirely when the user asked not to simplify.

**Output:** `✓ Step 3.S: Simplify [ran|skipped] - [scoped changes|clean|under threshold]`


## Verify and review

Run the narrowest useful test, then affected caller, type, lint or build checks according to
risk. Do not fake results, disable failing checks, or add tests that merely mirror code.
For type/lint-only repairs the compiler/linter can provide sufficient regression evidence.
Use `review-cycle.md` and `required-subagents.md` for review and delegation scope.
Repair regressions caused by this work within authorization. Under `--advice`, consult
oracle on each failed verification before edits or re-diagnosis as its checkpoint requires.

## Finalize

Reconcile completed work against all affected existing plan phases, preserving unchecked
items that lack evidence. Use `plan-state-files-first.md`; runtime tracking is optional.
Assess docs impact and update the smallest owning surface. Report outcome, verification,
remaining work and setup requirements. Commit only when already authorized. Apply the
journal preference contract in SKILL.md, reusing a preference resolved earlier in this run.
Continue the next authorized phase unless explicit interactive review or a real blocker stops it.
