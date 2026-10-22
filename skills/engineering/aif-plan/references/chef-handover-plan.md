# Handover Plan Contract (`--chef`)

Under `--chef`, a plan is not only supervised — it is written to be executed by
a **different, weaker model** than the one that planned it. A `--chef` plan is
routinely handed to a Sonnet-class or Flash-class executor that follows
instructions well but under-infers: it does not reliably reconstruct a missing
step, guess an unstated file path, or recognize on its own that it has gone off
the rails. The goal of this contract is a plan those executors can run
end to end without inventing anything.

Supervisor identity and model routing stay in
`../aif-brainstorm/references/advisory-supervision.md`. This file governs only the
shape of the plan artifact.

## The plan is the only thing the executor reads

The executor reads `plan.md` and the `phase-NN-*.md` files. It does not read this
reference, `cli-integration.md`, or any other planner instruction. So this
contract is **output text**: everything below must be materialized verbatim into
the generated phase files. A rule that lives only in the planner's head — "I
decomposed the phases and marked verification" — is invisible at the moment it
matters, when a check fails on the executor's machine. Author the plan so that a
model which never saw this document still stops and escalates correctly.

## Relationship to the standard phase template

This contract is a delta over the canonical phase-file template in
`cli-integration.md` (Goal / Files to Create or Modify / Tasks & Steps /
Verification). Keep that structure and add the handover fields below. Where the
richer section list in `plan-organization.md` overlaps these fields, the handover
fields are authoritative and additive — do not drop a handover field because a
similarly named section already exists.

Precedence when `--chef` combines with other modes:
- `--tdd`: the test-first commands become the `Verify` field's mechanical pass
  condition. When a task requires a failing test first (red phase), state that
  explicitly as the pass condition (e.g. `Verify: test command exits non-zero with
  assertion failure; passing test is a failure`) so the expected red state is
  not mistaken for a verification failure. The regression gate is one of the
  verification steps.
- `--deep`: keep the deeper inventories and scenario matrices; still decompose
  each phase into the per-task fields below.
- `--parallel`: the handover fields apply per task within each parallel phase;
  strict file-ownership boundaries are stated in each task's target files.

## What each phase must contain

Every phase decomposes into an ordered list of tasks. A task is one self-contained
unit of work the executor can finish and check before moving on. For each task,
the phase file states, in plain imperative language:

- **Goal** — the one observable outcome this task produces.
- **Target files and symbols** — exact paths and, where it matters, the function,
  type, endpoint, or config key to touch. Never "update the relevant file"; name
  it, because the weaker executor will not find it reliably on its own.
- **Steps** — the ordered actions to reach the goal, concrete enough that no
  intermediate step is left for the executor to infer.
- **Success criteria** — how the executor knows the task is done, stated as
  something it can observe, not a feeling of completion.
- **Verify** — either an explicit `no verification needed` for a pure edit whose
  effect the next task's verification already covers, or a mechanical pass
  condition (see below). Mark clearly which tasks require verification so the
  executor does not skip a load-bearing check or waste effort verifying a step
  that has no observable effect yet.

## Verification is a comparison, never a judgment

A weaker executor that under-infers does not know when it is stuck, so every
`Verify` field must be decidable by comparison rather than opinion. State the
exact command to run and the exact expected result: an expected exit code, an
expected substring in the output, an expected file that must now exist, or an
expected value. The executor runs the command and compares. "Confirm it works" is
not a verification; "`go test ./auth/...` exits 0 and prints `ok`" is.

## Failure Protocol (materialize this block in every phase file)

Every phase file must literally contain a Failure Protocol block so the executor
carries the escalation rule with the work. Write it into the plan; do not leave it
implied. Use this shape:

```markdown
## Failure Protocol
If any Verify step does not meet its stated pass condition, STOP this phase.
Do not improvise a fix, retry blindly, or reason around the failure.
Spawn the `aif-chef` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply chef's guidance, then re-run the Verify step.
If `aif-chef` cannot be spawned in this environment, STOP and report the same
failure evidence to the user. Never continue by self-reasoning.
```

The STOP is the load-bearing part. Spawning `aif-chef` is the enhancement; a plan
executed by an agent without a `aif-chef` subagent must still stop and hand the
failure back rather than degrade into confident guessing. This protocol applies
whenever a Verify step fails, whether or not the executor itself was invoked with
`--chef`.

## Illustrative example: a failing verification

Pattern the executor's behavior on a failure walkthrough, because weak models copy
the example harder than the prose. A phase task written under this contract:

```markdown
### Task 2.3 — Add the 401 branch to the auth middleware
- Goal: unauthenticated requests to protected routes return HTTP 401.
- Target files: `src/server/middleware/auth.ts` (function `requireAuth`).
- Steps:
  1. In `requireAuth`, after the token lookup, add: if no token, respond 401.
  2. Export nothing new; the middleware is already wired in `src/server/app.ts`.
- Success criteria: a request with no `Authorization` header gets 401, not 500.
- Verify: `npm test -- auth.middleware` exits 0 and prints `401 unauthorized`.
```

Now the executor runs `npm test -- auth.middleware` and it prints `500` and exits
1. The pass condition said exit 0 and `401 unauthorized`. They do not match, so the
executor does not edit further, does not guess that a different file is at fault,
and does not lower the assertion. It follows the Failure Protocol: it stops, spawns
`aif-chef` with the task id, the change it made, the failing command, and its full
output, and waits for counsel before touching the code again.

## Handoff note

When a plan is authored under this contract, say so in the post-plan handoff (see
`post-plan-handoff.md`): state that the plan is handover-ready for a downstream
executor and that each phase carries its own Failure Protocol. That tells whoever
runs it next that stopping on a failed check is intended behavior, not a stall.
