# Subagent Orchestration — the reasoning protocol applied to delegating work

Fable Thinking's moves, applied to the moment a controller hands work to other agents.
Delegation multiplies throughput and multiplies every failure mode in `reasoning-protocol.md`: a delegate
starts with none of your context, runs on a bounded window, cannot ask the user, and
reports in fluent prose whether or not it succeeded. Fable-grade orchestration treats a
delegate as a contractor and a witness — contract before spawn, disjoint ownership during,
verification after. The controller keeps the decisions; the delegates keep the toil.

## When to load this reference

Load BEFORE spawning any sub-agent or worker session — parallel implementation, scouting,
independent review, best-of-N candidates, long scans — and again when reading a delegate's
report. Load with `references/agentic-long-horizon.md` for the surrounding run; the
multi-runtime case is `references/runtime-orchestration.md`. For repository-level team
mechanics (worktrees per teammate, ownership indexes, wave scheduling) use the installed
team or orchestrate skill when present; this reference governs the judgment layer.

## Know Your Own Defaults (delegation failure modes)

- **Spawn reflex** — several agents for a grep-sized question. Activity, not progress;
  cost without information.
- **Context amnesia by design** — the delegate never saw the conversation. "As discussed"
  and "the file from before" are empty strings to it.
- **History dumping** — the opposite error: the whole transcript pasted into the prompt,
  burying the task and spending the delegate's window before it starts.
- **Report credulity** — "done, tests pass" read as OBSERVED. It is testimony.
- **Ownership collision** — two concurrent delegates editing one file, generated artifact,
  migration sequence, lockfile, or shared config.
- **Decision leakage** — a delegate settles scope, schema, or architecture the controller
  should have decided; the controller discovers it at merge time.
- **Fan-out without fan-in** — results collected, never reconciled; two delegates
  contradict each other and nobody notices.
- **Vague acceptance** — "look into X" returns an essay; "make X pass" returns a weakened
  test.
- **Identical retry** — the same prompt resent after BLOCKED.

## How to think (the moves, in orchestration order)

1. **FRAME: delegate or not.** Delegate when work parallelizes with disjoint ownership,
   when large reads would pollute the controller's context, when a fresh perspective is the
   point (independent review, best-of-N), or when a specialist or cheaper worker fits.
   Do it yourself when it is one file or one lookup, when it needs the conversation's
   judgment, when steps are strictly sequential, or when explaining takes longer than
   doing. Every spawn is a cost; justify each in one sentence.
2. **Choose the shape.** A fork (inherits your context) to continue your own reasoning; a
   fresh scoped worker for isolated tasks; a specialist (explorer, reviewer, planner) for
   its role; a cheaper model for scanning and bulk transforms, the strongest for judgment.
   Topologies: one parallel wave with fan-in; a sequential chain with handoffs; controller
   plus workers; best-of-N candidates plus one verifier. Pick the simplest that fits.
3. **Write the packet before spawning** (template below). Model the recipient: fresh,
   bounded window, cannot ask the user, sees only the packet. Task as an end-state; files
   to read; files it may modify, exclusively; checkable acceptance criteria; constraints
   (no commit, push, merge, or edits outside its ownership; scope flags passed verbatim);
   decisions it must respect, not the history that produced them; environment facts (cwd,
   worktree, branch, package manager, ports, homes); a budget; a report format ending in a
   status line.
4. **Partition ownership.** Freeze the shared contract first (interface, schema, types),
   then fan out implementations. No two concurrent delegates touch one path, generated
   artifact, migration sequence, lockfile, or shared config. Name integration points and
   their owner. Give risky parallel edits their own worktree.
5. **Run.** Spawn independent delegates in one turn; never poll; do other work or wait for
   the notification. Continue an existing delegate when its context is valuable; spawn
   fresh when its context is polluted or the task changed.
6. **Read the report with Claim Discipline.** Status line first. Every sentence is
   testimony: "tests pass" becomes OBSERVED when you run the narrowest test; "edited only
   X" when you diff. Verify in proportion to stakes — always for load-bearing claims,
   spot-check for scans, more for cheaper models.
7. **Fan in.** Reconcile before merging: contradictions between delegates are findings.
   Merge in dependency order. Re-verify the whole artifact after merge — one green per
   delegate says nothing about them together.
8. **Handle BLOCKED and NEEDS_CONTEXT by changing something** — context, scope, files,
   approach, model. Never resend the identical prompt. A delegate that needs the user
   relays the question upward; the controller asks.
9. **Deliver as the controller.** One report in your voice: what each delegate did, what
   you verified versus relayed, what remains. Delegates do not speak to the user.

## What good orchestration is (evaluable, not vibes)

- **Justified** — each spawn has a stated reason the controller could not do it cheaper.
- **Contracted** — every packet carries task, reads, ownership, acceptance, constraints,
  environment, budget, report format.
- **Disjoint** — no two concurrent delegates own one path or artifact.
- **Bounded** — budgets set; retries change something or stop.
- **Verified** — load-bearing delegate claims re-observed by the controller.
- **Reconciled** — fan-in resolved contradictions; the merged artifact re-verified whole.
- **Owned** — decisions, merges, user contact, and the final report stay with the
  controller.

## What to avoid (the slop catalog — matches are failed gates)

- "Spawned five agents to investigate" for a one-lookup question.
- A prompt that opens with the pasted conversation.
- A delegate's "tests pass" relayed to the user as fact.
- Two delegates both "owning" the shared types file, the lockfile, or the bundle.
- A delegate that committed, pushed, merged, or asked the user directly.
- "Both agents finished" when their conclusions disagree.
- The identical prompt sent again after BLOCKED.

## Details models habitually miss

- The delegate's shell starts elsewhere: pass absolute paths; the cwd may be a worktree;
  the stash stack is shared with every other session.
- Background processes a delegate starts become orphans unless the packet says to stop
  them before reporting.
- Scope-affecting flags (`--yagni`, a dry-run flag) revert silently unless in the
  packet.
- Permission and hook behavior may differ inside a delegate; a denied call is a signal to
  adapt, not an error to retry.
- Generated artifacts (bundles, lockfiles, snapshots, migration numbers) are single-owner.
- Long reports go to a file; the status line stays inline.
- A cheaper worker earns more verification, not less.
- Long-running delegates get one fallback check-in, never a poll loop.
- Cleanup before done: worktrees, temp files, processes.

## Verify (the loop)

1. Before spawn: the packet checklist is complete; the ownership map has no overlaps.
2. On report: parse the status line; check each acceptance criterion against the
   artifact, not the prose.
3. Diff the delegate's changes; flag any path outside its ownership.
4. Run the narrowest test per delegate, then the integrated test after fan-in.
5. Reconcile contradictions; re-run whole-artifact verification after merge.
6. Reconcile resources: processes, worktrees, temp files.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Justification | each spawn has a one-line reason | spawn log |
| Contract | all packet fields present | packet checklist |
| Ownership | no overlapping paths across concurrent delegates | ownership map |
| Verification | load-bearing claims re-observed | test runs, diffs |
| Reconciliation | contradictions resolved; merged artifact re-verified | fan-in notes |
| Hygiene | no orphan processes, worktrees, or temp files | resource check |

## Delegation packet template

```text
Task: <end-state, one sentence>
Read: <exact paths>
May modify: <exact paths — exclusive ownership>
Acceptance: <checkable criteria>
Constraints: no commit/push/merge; no edits outside "May modify"; <flags verbatim>
Decisions to respect: <decisions, not history>
Environment: cwd <absolute path> (worktree), branch <name>, pm <tool>, <ports/homes>
Budget: <steps / minutes / tokens>
Report: <file path or inline>; end with
  Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
  Summary: <one or two sentences>
  Concerns/Blockers: <optional>
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Spawn to feel productive | Justify each spawn; do one-file work yourself |
| Paste the conversation into the prompt | Pass decisions, paths, criteria, environment |
| Let two delegates share a file | Freeze the contract; assign disjoint ownership |
| Relay "tests pass" as fact | Run the narrowest test; diff the changes |
| Merge and declare done | Reconcile contradictions; re-verify the whole artifact |
| Resend the prompt after BLOCKED | Change context, scope, approach, or model |
| Let a delegate decide scope or talk to the user | Keep decisions and user contact in the controller |
