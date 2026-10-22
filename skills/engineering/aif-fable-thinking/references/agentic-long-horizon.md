# Long-Horizon Agentic Work — the reasoning protocol applied to multi-hour, multi-tool tasks

Fable Thinking's moves, applied to work that spans many tool calls, many files, and often
more than one context window. Fable 5.1's distinguishing trait here is not speed but
constancy: it stays anchored to the original ask, verifies each milestone before the next,
recovers from failures deliberately, and reports what is now true. Smaller models lose the
thread — they forget the ask, re-read what they already read, repeat failed probes, and
report activity instead of outcomes. This reference turns one long run into a chain of
short verified runs.

## When to load this reference

Load at the START of any task that will plausibly exceed ten tool calls or one context
window: multi-file implementation, migrations, refactors, CI convergence, autonomous or
"run until done" requests, sub-agent orchestration, anything with a plan file. Load again
after a context reset.

## Know Your Own Defaults (long-horizon failure modes)

- **Drift** — the goal quietly becomes "finish what I am doing" instead of the original
  ask. Nothing announces it; only re-reading the ask reveals it.
- **Activity ≠ progress** — tool calls feel like progress. Only a verified milestone is.
- **Context amnesia** — a fact established forty turns ago is re-derived, or worse,
  contradicted; an earlier OBSERVED is silently demoted to a guess.
- **Retry loops** — the same failing command run again with hope. The third identical
  failure costs as much as the first and teaches nothing.
- **Premature completion** — "done" declared at the first green check on the last edit,
  neighbors never re-verified.
- **Scope creep** — adjacent problems "quickly fixed" along the way; the diff, the risk,
  and the review grow without a decision.
- **Wrong autonomy** — blocking on a question a default would settle, or plowing through a
  destructive step nobody authorized.
- **Report-as-log** — the update lists actions taken instead of what is now true.

## How to think (the moves, in long-horizon order)

1. **FRAME the contract before the first tool call.** Outcome as an end-state; constraints;
   non-goals; acceptance criteria as observable checks; stop condition; reversibility tier
   of each planned mutation. Write it down — a plan file or task list, not memory. This
   is the anchor every later drift check compares against.
2. **Plan as a ledger, not a script.** Milestones, each with its own verification. Put the
   riskiest unknown first (a spike), not the easiest task. Order edits so the tree stays
   buildable at every step.
3. **Externalize state.** Keep one running note: decisions made, OBSERVED facts with their
   source (file and line, command and result), open questions, what is verified. Update
   it at every milestone. After a compaction or handoff the note is the truth, not your
   recollection.
4. **Execute in verify-loops.** Per milestone: produce → strongest granted check → repair →
   re-verify the whole artifact. A milestone is not done until its check is OBSERVED green
   on the final state.
5. **Recover deliberately.** On failure, classify first: my change, environment, flaky,
   wrong framing, missing information. Budget two attempts inside one framing; then change
   exactly one thing (altitude, direction, or ground — see When Stuck in `reasoning-protocol.md`). Never
   repeat an identical probe. Record what was tried so the next attempt is informed.
6. **Re-anchor at intervals.** Every few milestones and after every context refresh,
   re-read the original ask and the contract; diff the current trajectory against them;
   correct or flag. Drift is silent; this is the only alarm.
7. **Report at milestones, outcome-first.** What is now true, verified by what, what comes
   next, what is blocked and under which assumption you continue. Three lines, not a log.
8. **Finish by checklist.** Walk the acceptance criteria from step 1; each gets evidence or
   an explicit "not done, because". Then leave a handoff a fresh agent could resume from.

## Parallelism and delegation

Compact rules; the full protocol (when to delegate, the packet, ownership, fan-in,
report verification) is `references/subagent-orchestration.md`, and handoffs across
agent runtimes are `references/runtime-orchestration.md`.

- Run independent reads and checks in parallel; sequence dependent edits.
- A delegation is a contract: task, exact files to read, files it may modify (disjoint
  ownership across parallel workers), acceptance criteria, constraints, work-context path,
  and a report format ending in a status line. Pass decisions, not history.
- Treat a sub-agent's report as testimony: verify its load-bearing claims yourself (open
  the file, run the test) before building on them.
- Use lower effort or cheaper workers for reading-heavy scanning; keep judgment, merges,
  and user-facing decisions in the controller.

## Autonomy boundaries

- Proceed without asking on reversible, additive, in-scope actions.
- Stop and confirm before destructive, irreversible, or outward-facing actions and before
  a real scope change. Approval in one context does not extend to the next.
- When blocked on the user: do everything that does not depend on the answer, state the
  assumption you continue under, and keep going.

## What good long-horizon work is (evaluable, not vibes)

- **Anchored** — the final result answers the original ask, checked by re-reading it.
- **Verified per milestone** — every milestone has an OBSERVED check, not only the last.
- **Traceable** — a reader can reconstruct why each decision was made from the note.
- **Bounded** — the diff touches only owned scope; adjacent issues got one sentence.
- **Recoverable** — plan plus note survive a context reset; a fresh agent could resume.
- **Honest** — blocked, skipped, and unverified items are named in the delivery.

## Details models habitually miss

- The stop condition. Decide what "done" means before starting, or you stop when tired
  or when tokens run out.
- Environment drift: a file read thirty turns ago may have changed (your own edit, a hook,
  another process). Re-verify before editing from stale memory.
- Registration sites: a new module, command, test, or page must be registered wherever
  its siblings are. Find every place a sibling appears before declaring done.
- Background processes started and never stopped; held ports; temp files; worktrees.
- Tests that "passed" because they were skipped, ran on the wrong tree, or ran before the
  last edit.
- The final re-read of the ask — the single cheapest drift catch, and the most skipped.

## Verify (the loop at three scales)

1. **Per edit** — syntax, type, and lint checks on the touched file.
2. **Per milestone** — the milestone's declared check: tests for touched behavior, a
   rendered result, a diff read as a reviewer.
3. **Per task** — the full acceptance list from FRAME, plus broad checks when shared
   contracts changed; re-verify the whole artifact on the final tree, not the last change.
   Run the negative-space scan: missing tests, docs, migrations, registrations, cleanup.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Anchoring | result matches the original ask and contract | re-read plus criteria checklist |
| Milestones | every milestone check OBSERVED green | check log in the note |
| Scope | diff limited to owned files; adjacent flagged, not fixed | diff review |
| Recovery | no identical failed probe repeated; attempts recorded | attempt log |
| Handoff | a fresh agent could resume from plan plus note | note review |
| Honesty | blocked, skipped, unverified named | delivery text |

## Progress update template

```text
Done: <milestone>, verified by <check and result>.
Now: <next milestone>.
Open: <blocker or question>; continuing under assumption: <x>.
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Start with the first tool call | Write the contract: outcome, criteria, stop condition, reversibility |
| Keep state in your head | One running note; update at every milestone |
| Count tool calls as progress | Count OBSERVED-green milestones |
| Re-run the failed command | Classify the failure; change one thing; record the attempt |
| Declare done at the last green check | Walk the acceptance list; re-verify the whole artifact |
| Fix the adjacent bug you noticed | One sentence in the delivery; stay in scope |
| Ask before every reversible step | Proceed on reversible work; confirm destructive or scope changes |
| Report what you did | Report what is now true, verified by what, and what is open |
