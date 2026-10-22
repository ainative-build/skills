# Reasoning Protocol (load when the reasoning is not already automatic)

Use the relevant techniques below when a task has unresolved evidence, competing explanations or a consequential decision. Select them from task evidence, not a self-assessment of model capabilities. Record concise evidence and conclusions, not private reasoning transcripts.

## Know Your Own Defaults (why models reason badly)

Models fail at reasoning in predictable ways. Naming them is the first countermeasure:

- **Pattern-match satisfaction** — the first explanation that fits a familiar template feels
  like the diagnosis. Familiarity is retrieval, not verification. Countered by Move 3.
- **Template hijack** — a question whose surface matches a stored template ("flaky test →
  add retry", "slow query → add index") fires the template's answer before this question's
  constraints are read. Familiarity raises the risk rather than lowering it. Countered by
  the Floor.
- **Fluent ≠ true** — your own well-formed prose feels more correct as it flows. Confidence
  rises with token count, not with evidence. Countered by Move 4.
- **Prior-as-fact** — training knowledge gets stated in the grammar of observed fact. Priors
  decay: APIs change, versions move, prices update, docs rot. Countered by Claim Discipline.
- **Confirmation seeking** — once you have a favorite hypothesis, you pick tests it will
  pass. Countered by the discriminating-test rule in Move 3.
- **Frame adoption** — you inherit the user's framing ("the cache is broken again") as fact.
  The user is a witness, not an oracle: trust their goal absolutely, treat their diagnosis
  as testimony to verify. Countered by Moves 1 and 2.
- **Completion pressure** — producing something answer-shaped now feels better than checking
  one more thing. An answer-shaped non-answer is worse than "here is what I verified and
  what is still open". Countered by the Self-Review Gate.
- **Surface blindness** — you produce and read text as tokens, not characters. Any claim
  about the surface form of your own output — which symbols it contains, how many units
  it has, whether a pattern holds — is a guess unless verified unit by unit or by tool;
  re-reading always reports a pass. Worse, generation is meaning-driven, so the most
  natural wording for the topic is the likeliest violator of a surface constraint.
  Countered by the Constraint Loop.

## Outcome checks for ambiguous or consequential work

Select these checks when the request or proposed answer may miss the intended outcome. Reuse an already-clear contract.

1. **Goal** — state the end-state the asker wants in the world, not the question's wording.
   Mechanical rule: take the request's main verb and its object — the goal is "*object*
   has been *verb*-ed", a finished state of the object. It is never "reach the place
   where the verb happens", "the message was sent", or "the better option was picked" —
   those are milestones and framings, not outcomes. Hard test: the goal sentence must
   not mention any of the offered options. If it does ("get there", "send it"), you have
   restated the question's framing as the goal, and every later check will pass
   vacuously.
2. **Follow-through** — run the movie: the asker does exactly what you are about to say.
   The movie ends only at the frame where the goal state is verified — never at the
   first milestone (arrived, sent, submitted, deployed). At that final frame, take
   inventory: is every object the goal operates on actually present, and every channel
   or tool it depends on actually working, right there? An option can reach the
   milestone perfectly and still leave the goal impossible. If the goal state does not
   hold at the final frame, the answer is wrong no matter how sensible it sounds.
3. **Leftovers** — name any detail of the request your answer never used. In a short
   question every detail is load-bearing; an unused one usually marks the trap or a
   constraint you ignored. Use it, or say why it does not matter. Weighting: the nouns
   naming the task's object outrank every number — distances, counts, durations, and
   prices are the commonest bait, placed to look like the deciding factor while the
   object noun quietly decides everything.

Why this catches trick questions: trap questions are built so the surface matches a
familiar template while one detail changes the answer — an option that quietly leaves the
goal's object behind, routes the fix through the broken thing, or violates a constraint
stated in plain sight. The Floor forces a fresh derivation from this question's own
details instead of the template's stored answer. Three tells that you are inside a trap:
the answer arrived instantly with high confidence; your draft never used one of the
question's details; your goal statement mentions one of the options or stops at a
milestone. Any tell means: stop, step back, re-derive.

An answer is an action in the world — check it against the world, not against the
question's multiple-choice framing. If any Floor check trips, the question was not as
simple as it looked: leave Direct mode and run the five moves.

## Proportionality Gate (after the Floor)

Choose depth from the unresolved task and evidence. A useful heuristic is
stakes × irreversibility × novelty. Over-applying the full protocol to trivial asks is
itself a calibration failure — a simple question gets a direct answer, after the Floor.

| Mode | When | What runs |
|------|------|-----------|
| **Direct** | Trivial, reversible, familiar (fact lookup, rename, small edit) | Answer directly with supported claims. |
| **Standard** | Normal work (bugfix, review, analysis, document) | All five moves, applied internally. |
| **Full** | High stakes, irreversible, unfamiliar, or contested (production incident, architecture, security, money, data migration) | Check relevant failure modes independently; report evidence, alternatives and the decision. |

Feeling familiar is not evidence of being simple — familiar-looking questions are where
template hijack lives. A tripped Floor check reclassifies the question out of Direct on
the spot. So does a mechanically checkable output constraint (banned letters, exact
counts, acrostics, strict formats): those tasks are never Direct, no matter how short the
ask — run the Constraint Loop below.

## The Five Moves

### Move 1 — FRAME: find the real question

1. Restate the ask in one sentence, plus the goal as an end-state of the world — what is
   true when this succeeds. Name the deliverable type: answer, change, assessment,
   artifact, or decision. A question about a problem wants an assessment, not an
   unrequested fix.
2. Separate the literal request from the goal behind it. If they diverge, serve the request
   and flag the divergence — never silently substitute your own goal.
3. Draw the scope line: name what is adjacent but NOT asked. Adjacent problems get one
   sentence at delivery, not work.
4. List the 1–3 load-bearing facts — the ones that, if wrong, collapse the whole answer.
   These get verified first in Move 2.
5. On long tasks, re-read the original ask at intervals. Drift is silent.

### Move 2 — GROUND: establish truth before reasoning on it

1. Sort what you are holding using Claim Discipline (below): what did you OBSERVE this
   session, what is PRIOR training knowledge, what are you ASSUMING?
2. Verify load-bearing facts with tools, not memory: open the file, run the command, fetch
   the doc. The cheapest way to be right is to look. Batch independent checks in parallel.
3. Respect the evidence ranking: direct observation > reproduction > primary source >
   secondary source > memory. Never build on a lower rank when a higher one is one tool
   call away.
4. Treat version-sensitive claims (APIs, flags, defaults, prices, model names) as stale
   until checked.
5. Read errors literally before interpreting them: the exact message, the exact line, the
   actual values — not what you expect them to say.

### Move 3 — REASON: mechanism, hypotheses, simulation

1. Hold at least two hypotheses before investigating any single one. If you cannot produce
   a second, you are pattern-matching, not diagnosing. Write them down.
2. Choose the next observation by discrimination: which check best splits the surviving
   candidates? Not: which check confirms the favorite.
3. Demand mechanism. "X causes Y" requires the full chain X → … → Y with each step
   checkable. A gap in the chain is an assumption — mark it or verify it.
   Same-symptom-as-last-time is a hypothesis, never a conclusion.
4. Simulate with concrete values. Trace code, plans, and processes with actual inputs:
   empty, one, typical, boundary, huge, malformed, concurrent, unicode/locale-weird.
   "Looks right" in the abstract is not evidence; most wrong conclusions die on the first
   concrete trace.
5. For any change, write the invariant ledger: **preserves** (what stays true), **breaks**
   (deliberately, with migration), **risks** (could break — watch it). If you cannot write
   the ledger, you do not understand the change yet.
6. Scan the negative space: what should exist and does not? The missing error path, missing
   test, missing case in the switch, absent log line, the question nobody asked. Enumerate
   what completeness requires, then diff reality against it.

### Move 4 — ATTACK: try to kill your own conclusion

1. Switch roles: you are now the reviewer whose job is to reject this work. Write the
   strongest objection. If it lands, handle it before delivering.
2. Ask: what evidence would prove me wrong — and did I actually check for it? Absence of
   counter-evidence you never looked for is not support.
3. If a cheap kill-test exists (one more run, one grep, one trace), run it NOW. Skipping a
   cheap kill-test to protect a conclusion is this protocol's cardinal sin.
4. Audit your confidence: at each point it rose, name the evidence that moved it.
   Confidence that grew from effort, repetition, or eloquence resets to the last
   evidence-backed level.
5. Name the weakest link — the one part you are least sure of goes into the delivery, not
   into your private thoughts.

### Move 5 — DELIVER: calibrated, outcome-first, for the absent reader

1. First sentence states the outcome: the answer, the verdict, what changed. Evidence
   after. Caveats last — but present.
2. Grammar matches claim type (table below). Never let an assumption wear the grammar of
   an observation.
3. Report failures and partial results plainly, with the raw evidence. No soft hedging on
   things you verified; no confident gloss on things you did not.
4. Write for a reader who did not watch you work: no shorthand or labels invented mid-task,
   complete sentences, terms spelled out.
5. Close with unresolved questions and risks, if any exist. An honest open-issues list
   beats implied completeness.
6. Done is a checklist, not a feeling: re-read the original ask; the deliverable answers
   it; load-bearing facts verified or flagged; scope respected — nothing silently cut,
   nothing gold-plated.

## Altitude Control

Problems and fixes live at four altitudes: **intent** (what is this for) → **design**
(what shape solves it) → **implementation** (which lines) → **mechanics** (exact bytes,
versions, environment).

- Diagnose the altitude before fixing. The most common bad fix is a line-level patch for a
  design-level fault; the second most common is redesigning what a one-line mechanical fix
  solves.
- When reasoning stalls at one altitude, deliberately move one level up or down. Errors
  hide at altitude boundaries.

## When Stuck

Two or three failed attempts inside one framing means the framing is wrong — not that the
effort was insufficient. Never repeat a failed probe harder. Change exactly one of:

- **Altitude** — zoom out (what is this actually for?) or in (what are the exact bytes?).
- **Direction** — invert: "what would have to be true for it to fail exactly this way?"
  and work backwards from the failure.
- **Ground** — stop reasoning; go collect the missing observation (a log, a minimal
  reproduction, a bisect).

Deeper toolkit for stuck-ness: `aif-problem-solving`. Long multi-step chains with explicit
revision: the sequential mode in `references/thinking-modes.md`. This skill governs how
single conclusions get made and reported; the stuck toolkit governs larger exploration
structures.

## Portable Techniques (how to think the moves, on any model)

The moves say WHAT to check; these techniques are HOW to execute the checking. They need
no special runtime — only tokens — and they are the highest-leverage habits for models
that reason well but default to answering fast. Reach for one whenever an answer starts
forming automatically:

- **Step back first** — before answering the specific question, name the general
  principle or problem class it is an instance of, then apply that principle to the
  specifics. Deriving the abstraction first blocks the template answer that rides in on
  surface details. Ask "what kind of problem is this?" before "what is the answer?".
- **Chain the thought, answer last** — reason in explicit numbered steps, each depending
  on the previous, and state the conclusion only after the chain ends. Never emit the
  answer first and justify it afterwards: post-hoc justification always succeeds, which
  is exactly why it proves nothing.
- **Restate before solving** — rewrite the question in your own words with every detail
  and constraint included. A detail that will not fit in your restatement is either the
  trap or a constraint you were about to drop. This is the Floor's Leftovers check run
  proactively.
- **Derive twice, independently** — for any load-bearing conclusion, reach it a second
  time by a different route: different starting point, inverted direction, different
  method. Agreement is mild support; disagreement is a hard stop signal worth more than
  either answer.
- **Concretize** — replace abstractions with actual values and walk them through step by
  step. "Looks right" in the abstract survives; it rarely survives one concrete trace.
- **Invert** — assume your conclusion is wrong and ask what it would have had to miss.
  Working backwards from imagined failure finds holes that forward reasoning steps over.
- **Treat instant answers as alarms** — an answer that arrived before you finished
  reading is retrieval, not reasoning. Demote it to a hypothesis and run the Floor
  against it deliberately. Speed plus confidence is the signature of template hijack,
  not of correctness.
- **Switch thinking mode deliberately** — when the conventional answer violates a
  constraint, rebuild from what is verifiably required (first principles); when steps
  depend on earlier ones, number them and mark revisions (sequential); when every option
  fails, fill a quota of options before judging any (creative). Modes generate material;
  the moves still check it. Procedures and budgets: `references/thinking-modes.md`.
