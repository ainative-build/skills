# Token Economy — Fable-grade reasoning at a smaller model's budget

Efficient reasoning avoids paying twice for unchanged evidence while preserving the
checks needed for a correct outcome. Model-specific speed or token claims require a
dated, comparable benchmark. Judge the completed task, including retries and integration,
not one cheap request. When choosing a model, weigh cost, duration, first-attempt
success and agent-step count together.

## When to load this reference

Load when running on a constrained budget, when a task will span many tool calls, when
configuring effort for sub-agents, or when a previous run of a similar task felt slow or
verbose. The Proportionality Gate in `reasoning-protocol.md` chooses depth; this reference governs how
that depth is spent.

## The three budgets

- **Reading** (input) — what enters context.
- **Thinking** (reasoning) — where depth goes.
- **Output** — what goes back to the reader.

Rule: spend thinking on load-bearing facts, reading on the owner, output on the outcome.

## Proportionality, made operational

| Mode | Reading | Thinking | Output |
|------|---------|----------|--------|
| Direct | at most one targeted check if a load-bearing fact is tool-checkable | the Floor plus claim typing | a few sentences |
| Standard | owner plus adjacent tests and contract | five moves internally; one verify-loop | outcome, evidence, caveats |
| Full | owner, callers, contracts; parallel independent checks | moves written; Attack pass | outcome, evidence table, risks, open items |

Escalate on a tripped Floor check or a hard output constraint; de-escalate once evidence
converges. Spending Full on a Direct ask is a calibration failure and a cost.

## Reading rules

1. **Search before read.** Locate the owner with a targeted search, then read the relevant
   range. Read whole files only when they are small or when structure is the question.
2. **Read once, note once.** For long work, retain decisions and load-bearing evidence
   in a compact ledger with source/revision. Refresh when state changes; do not log every read.
3. Read the contract and tests next to the change, not the whole module.
4. Prefer structured queries (a symbol, a test name, an error string) to browsing.
5. Extract the relevant lines from large tool output; do not carry the dump forward.
6. Re-read only when the file may have changed (you edited it, a hook ran, time passed) —
   and then only the changed region.

## Tool-call rules

1. Batch independent reads, searches, and checks into one turn.
2. One discriminating check beats three confirming ones (Move 3).
3. Prefer event waits; poll only when needed, with bounded frequency and a stop condition.
4. Retry transient failures with bounded backoff when safe. Diagnose deterministic failures
   before repeating; inspect uncertain mutation outcomes before retrying.
5. Run focused checks first; broaden for repository gates, shared contracts and material risk.
6. Scope sub-agents tightly: task, exact files, acceptance criteria, report format. Pass
   decisions, not history. Consider measured model/effort trade-offs for scanning when authorized; verify their
   load-bearing claims yourself. Packet template: `references/subagent-orchestration.md`.

## Thinking rules

1. Your ledger of OBSERVED and DERIVED facts is a cache — consult it instead of re-deriving.
2. Stop when the decision is made. Reasoning past convergence is cost without information.
3. Think in the private space when the runtime grants one; deliver only Move 5.
4. Restate the ask once (the Floor), not at every step.
5. Two hypotheses and one discriminating check — not five hypotheses and ten confirmations.
6. Depth follows stakes × irreversibility × novelty, never the length of the question.

## Output rules

1. Outcome first. No preamble, no restatement of the question, no announcement of what
   comes next.
2. Density: one idea per sentence; lists only for parallel items; tables for numbers; code
   in blocks, never in prose.
3. Do not echo tool output or file contents unless the reader needs those exact lines.
4. Report verification as evidence lines (command plus result), not narrative.
5. Caveats last but present; open questions as a short list.
6. Progress updates at milestones, three lines each, not per action.

## Anti-patterns (cost without information)

- "Let me also check…" spirals after the answer has converged.
- Reading the whole repository to find one function.
- The full suite before the narrow test, for a one-file change.
- Restating the plan before each step; summarizing what was just done.
- Hedging every sentence — costs tokens and trust at once.
- Explaining the protocol to the reader ("First I will apply the Floor…").
- Several sub-agents for a one-file question.
- Re-running green tests to feel safe.

## Minimum viable protocol under a tight budget

The Floor (three sentences) → verify the single most load-bearing fact if a tool can →
answer outcome-first with typed claims → name the weakest link. Never less than this.

## For harness and prompt authors

Keep the stable prefix stable: system prompt and tool list first, volatile content (time,
per-request identifiers, the question) last, so prompt caching pays. Set effort per route,
measured on real requests, rather than one global setting. Judge cost per completed task.

## Self-check (act-backed)

| Question | Evidence |
|----------|----------|
| Did I read only what the owner required? | the list of reads |
| Did I batch independent calls? | the turn structure |
| Any identical retry? | the attempt log |
| Did I stop when the decision was made? | reasoning length against evidence gained |
| Is the output outcome-first with no echo? | the first sentence |

## Do / Don't

| Don't | Instead |
|-------|---------|
| Open files to remember what they said | Keep a ledger; read once |
| Serialize independent checks | Batch them in one turn |
| Blindly retry failures | Classify; back off for transient errors, fix deterministic causes |
| Think until the budget ends | Stop at convergence; name the residual risk |
| Narrate the process | Deliver the outcome and the evidence |
| Spend Full effort on a lookup | Match depth to stakes, irreversibility, novelty |
