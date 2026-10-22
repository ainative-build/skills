# Solution Exploration — creative solution design and efficient search of the option space

Most engineering mistakes are not bugs in the chosen solution; they are the wrong solution,
chosen because only one was considered. Fable's habit: before committing, generate a real
option set, explore it with the cheapest probes that kill options fast, and choose against
criteria written before the options existed. Creativity here is a search procedure, not
inspiration; efficiency is the shortest sequence of experiments that separates the options.
`references/thinking-modes.md` supplies the generators; this reference is the engineering
application, from problem to an evidence-backed choice at minimum exploration cost.

## When to load this reference

Load BEFORE committing to an approach for anything non-trivial: a feature design, a
performance problem, an integration, a migration strategy, a tooling or library choice;
when the obvious approach violates a constraint; when every option so far has failed; when
asked for alternatives or "the best way". Skip it for tasks with a known answer — there the
Proportionality Gate says Direct. Structured group ideation with verifier passes:
`aif-brainstorm`; the stuck-specific toolkit: `aif-problem-solving`.

## Know Your Own Defaults (exploration failure modes)

- **First-option lock-in** — the first workable idea becomes "the plan"; alternatives are
  never generated.
- **Option theater** — three options where two are strawmen built so the favorite wins.
- **Exploration by building** — implementing the whole thing to learn whether it works;
  the most expensive probe chosen first.
- **Analysis paralysis** — options compared on paper indefinitely when a timeboxed spike
  would settle it.
- **Novelty or convention bias** — the clever option because it is clever; the familiar
  one because it is familiar.
- **Criteria after the fact** — the choice made, then criteria written to justify it.
- **Sunk-cost continuation** — an approach kept alive after evidence killed it because
  time was spent.
- **The unconsidered removal** — never asking whether the problem can be deleted instead
  of solved.

## How to think (the moves, in exploration order)

1. **FRAME the problem, not a solution.** End-state; hard constraints (must); preferences
   (should); the cost of being wrong; reversibility. Write the criteria now, before any
   option, so they cannot be bent later. Include the abandon condition: what evidence
   would make you drop the chosen path.
2. **Question the problem.** Is it the real problem or a symptom? Can it be removed
   rather than solved — delete the feature, change the requirement, move the boundary?
   Run the first-principles pass: which constraints are verified, which are inherited.
3. **Generate a real option set.** Quota: three to five genuinely different mechanisms
   (five to seven when stuck). Generators: the convention (what the ecosystem does); the
   boring option (one table, one process, one file); the removal option; the inversion;
   the cross-field analogy; the recombination of two rejects; the scale shift (one user,
   a million users); buy, build, or borrow. Each option in at most three lines —
   mechanism, main risk, cost. No judgment until the quota is filled.
4. **Prune with cheap kills.** For each option, the single cheapest observation that
   would kill it: a documentation lookup, a search of the codebase (it may already do
   this), a five-line script, a measurement of the real data size or latency. Run the
   kill-tests cheapest first, independent ones in parallel. Most options die in minutes.
5. **Spike the survivors, timeboxed.** A spike answers one question with throwaway code.
   Set the question and the budget before starting ("can this stream one gigabyte in
   under two seconds — forty-five minutes"). Keep the evidence; discard the code. At most
   two survivors; three means the criteria are not sharp enough.
6. **Decide with the criteria from step 1.** Must-haves are pass or fail; then cost,
   risk, reversibility, simplicity. Prefer the simplest option that passes the
   must-haves; prefer the reversible option over the optimal one when uncertainty is
   high. Record what would change the decision.
7. **Make the decision legible.** Chosen option; rejected options with the evidence that
   killed each; assumptions; revisit trigger. A short decision record per
   `references/engineering-prose.md`. The rejects are part of the deliverable — they
   prove the space was searched.
8. **Attack.** What did you not try? Did the favorite get an easier kill-test than the
   others? If the choice is the first idea, was that earned by evidence or defaulted?

## Efficient exploration (the rules that keep search cheap)

- Order probes by information per unit cost: cheap and discriminating first.
- Breadth-first and shallow across all options, then depth-first on survivors — never
  depth-first from option one.
- Budget exploration as a fraction of the task (a tenth to a fifth is typical); stop when
  no remaining option can beat the leader by more than the cost of finding out.
- Reuse before invent: search the codebase, the ecosystem, and prior decisions; the
  existing pattern wins ties.
- Parallelize independent probes; delegate cleanly scoped ones per
  `references/subagent-orchestration.md`.
- Measure instead of estimating when measuring is cheap: real sizes, real latencies, real
  limits.
- Set the stop rule before starting: which evidence ends exploration.

## What good solution exploration is (evaluable, not vibes)

- **Criteria-first** — must, should, cost of error, reversibility written before options.
- **Real options** — at least three distinct mechanisms, none a strawman.
- **Cheap-first evidence** — every reject names the observation that killed it.
- **Timeboxed** — each spike had a question and a budget, and the budget held.
- **Simplest sufficient** — the choice is the least complex option that passes the
  must-haves, or the extra complexity is justified in writing.
- **Legible** — decision, rejects, assumptions, revisit trigger recorded.

## What to avoid (the slop catalog — matches are failed gates)

- "I considered several approaches" with none named.
- Two strawmen and a favorite.
- A week of implementation as the first experiment.
- A pros-and-cons table with no measurements in it.
- "Best practice" as the entire justification.
- The clever option shipped without a spike.
- Criteria that appear for the first time in the conclusion.

## Details models habitually miss

- The do-nothing and remove-the-requirement options.
- Operational cost: who runs it at night; migration and rollback; observability.
- Reversibility as a criterion: two-way doors decided fast, one-way doors slowly.
- Second-order effects: what this makes harder later; what it locks in.
- The team's existing skills and tooling — a superior tool nobody can operate is inferior.
- Non-functional requirements: latency, throughput, data volume in a year, compliance.
- Hidden constraints from adjacent systems: rate limits, schema owners, release cadence.

## Verify (the loop)

1. Criteria exist and predate the options in your notes.
2. Each option has mechanism, risk, and cost lines; at least three distinct mechanisms.
3. Each rejection cites an observation, not an opinion.
4. Spike questions answered within budget; evidence retained.
5. The chosen option passes every must-have; any extra complexity is justified.
6. Decision record written; revisit trigger set.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Criteria | written before options; abandon condition present | option sheet header |
| Breadth | three or more distinct mechanisms, no strawmen | option list |
| Evidence | each reject killed by an observation | kill results |
| Discipline | spikes timeboxed and answered | spike log |
| Simplicity | least complex passing option, or justified | decision note |
| Legibility | decision record with rejects and revisit trigger | record exists |

## Option sheet template

```text
Problem (end-state): ...
Must: ... | Should: ... | Cost of error / reversibility: ... | Abandon when: ...
Options:
  A <name>: mechanism | main risk | cost | cheapest kill-test
  B <name>: ...
  C <name>: ...
Kill results: A killed by <observation>; B survived; C survived
Spikes: B — question, budget, result; C — question, budget, result
Decision: <option>, because <criteria>; rejected: ...; assumptions: ...; revisit when: ...
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Plan around the first workable idea | Fill the option quota before judging any |
| Write criteria after choosing | Write must, should, cost of error first |
| Test an option by building it | Find its cheapest kill-test; spike only survivors |
| Keep a dead option alive for sunk cost | Record what killed it and move on |
| Choose the clever option on excitement | Same evidence bar; simplest sufficient wins |
| Deliver only the choice | Deliver the choice, the rejects, and the revisit trigger |
