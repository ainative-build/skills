# Thinking Modes — first principles, sequential thinking, creative thinking

The five moves in `reasoning-protocol.md` govern how one conclusion gets made and checked. Thinking modes
are ways to GENERATE the material the moves then check: rebuilding from what is actually
true (first principles), walking a dependent chain with visible revisions (sequential),
producing options the default path would never emit (creative). A mode is cheap to name
and expensive to run — pick one deliberately, give it a budget, and hand its output to the
moves. Running a mode is never a substitute for Ground and Attack.

## Choosing a mode

| Symptom | Mode |
|---------|------|
| "Everyone does it this way"; the conventional answer violates a constraint; high-stakes design | First principles |
| Later steps depend on earlier ones; understanding evolves; revisions likely | Sequential |
| Every option fails; all options share one shape; a breakthrough is asked for | Creative (diverge, then converge) |
| Evidence contradicts itself; the framing is unclear | Sequential with branches |
| A known problem with a known answer | None — the moves alone; a mode here is waste |

## First-principles thinking

**Why.** Analogy ("X does it this way, so we do too") imports X's constraints, not yours.
First principles rebuilds from what is verifiably true and actually required here.

**Procedure.**

1. State the goal as an end-state (the Floor's Goal check).
2. List every assumption in the current or conventional approach. Mark each: logical or
   physical necessity; verified constraint (OBSERVED this session); convention; inherited
   by analogy.
3. Discard conventions and analogies. Keep necessities and verified constraints in one list
   titled "what must be true".
4. Rebuild the minimal solution from that list alone. Re-admit a convention only when it
   earns its place with a stated reason (ecosystem, migration cost, team skill).
5. Cost the rebuild against the conventional path honestly. First principles often
   confirms convention — a valid outcome; the reason is now known instead of assumed.
6. Hand the result to Ground and Attack like any other conclusion.

**Budget.** Expensive. Use for design and architecture decisions, when the conventional
answer breaks a constraint, or when the cost structure changed (a new tool or model makes
an old constraint moot). Never for routine work.

**Tells you are doing it wrong.** You are merely contrarian; you discarded a verified
constraint; you rebuilt the same thing under new names; you skipped step 5.

**Compact example.** "We need a message queue because service B is slow." Assumptions: B is
slow (verify — measure); the heavy step must be asynchronous (necessity — the user needs a
response within one second); a queue is required (convention — a table with a status
column and a worker satisfies the constraints at current volume). Rebuild: table plus
poller now; adopt a queue when measured throughput demands it. Convention confirmed later
by evidence, not assumed now.

## Sequential thinking

**Why.** Long chains fail silently when step seven forgets step two. Sequential thinking
makes each step depend visibly on the previous one and allows revision without restarting.

**Compact protocol (token-lean).**

- Estimate the step count loosely; number thoughts `T1/5`; one aspect per thought; each
  thought ends with what the next must address.
- `[REVISION of T2]` when an insight invalidates an earlier step: original, why, impact.
- `[BRANCH A / B from T3]` for alternatives; compare explicitly; converge with a reason.
- `[HYPOTHESIS]` → `[VERIFICATION]` pairs for anything checkable.
- `[FINAL]` only when the goal state is derived, load-bearing claims are typed, and no
  contradiction is open.

**Where to run it.** In the private reasoning space when the runtime grants one; otherwise
as a short visible chain (restate → numbered steps → answer last). Number each thought
(`T1/N`), mark revisions (`[REVISION of T2]`) and branches (`[BRANCH A]`), and close with
`[FINAL]` so a reader can audit the chain without extra tooling.

**Token rules.** One to three sentences per thought. Reference earlier thoughts by number;
never restate them. Contract the estimate when the problem turns out simpler.

**Tells you are doing it wrong.** Thoughts that do not reference earlier ones (a list, not a
chain); zero revisions on a genuinely hard problem (not honest); a chain that grows without
converging (switch: change altitude or go collect ground).

## Creative thinking

**Why.** Models converge on the modal answer. Creativity is a procedure for leaving the mode
on purpose, then selecting with rigor. It lives in hypothesis generation; evidence still
decides.

**Divergent phase (budgeted, quota-based).**

1. **Quota.** Produce five to seven options before evaluating any. Include at least one
   that breaks a "rule", one borrowed from another field, and one that removes the problem
   instead of solving it.
2. **Generators.** Constraint as generator (a tenth of the budget; must work offline; the
   schema cannot change). Inversion (design the worst solution; flip each property).
   Analogy and collision (how would a bank, a game engine, a compiler handle this?).
   Recombination (merge two rejected options). Subtraction (remove the component).
   Scale shift (one user versus a million; one millisecond versus one day).
3. **Defer judgment.** No "won't work" during generation; one line per option.

**Convergent phase.**

4. Score against the criteria from FRAME: must-haves, nice-to-haves, cost of error. Keep the
   strange option alive until it fails a criterion on evidence, not on discomfort.
5. Prototype the top two cheaply when possible. Evidence, not enthusiasm.
6. Deliver the recommendation with the discarded options and why — the reader can see the
   space was explored.

**Tells you are doing it wrong.** The first option won; all options are variations of one
shape; the "creative" pick shipped without meeting the evidence bar; creativity spent on a
problem that had a known answer. Deeper stuck toolkit: `aif-problem-solving`. The
engineering application — option sheet, kill-tests, timeboxed spikes, decision record —
is `references/solution-exploration.md`.

## Combining modes on a hard problem

Floor → FRAME → first principles (what must be true) → creative divergence (options against
that list) → sequential chain to evaluate the top options → Attack → Deliver. Budget each
stage; stop at the first stage that yields a decision meeting the criteria.

## Do / Don't

| Don't | Instead |
|-------|---------|
| Run a mode because it sounds rigorous | Match the symptom to the mode; skip it for known problems |
| Discard verified constraints as "assumptions" | Keep OBSERVED constraints; discard only conventions and analogies |
| Restate earlier thoughts in each new one | Reference by number; one aspect per thought |
| Never revise on a hard problem | Mark revisions explicitly when evidence invalidates a step |
| Evaluate the first idea as it appears | Fill the quota first; judge after |
| Ship the novel option on excitement | Same evidence bar; spike the top two |
| Let a mode replace verification | Hand every mode's output to Ground and Attack |
