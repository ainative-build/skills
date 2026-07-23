# Deepening patterns & the design walk

Concrete shapes for step 1 (what to look for) and a structured conversation for step 3 (how to
design the fix with the user).

## Common shallow→deep patterns

Recognize these; each is a candidate shape, not a mandate.

1. **Pass-through wrapper → inline or deepen.** A module that only forwards to another, adding a
   rename or a trivial default. Inlining it leaves the callers barely changed — the wrapper is
   shallow. Either delete it, or give it a real job (validation, defaulting, error translation) so the
   interface earns its keep.

2. **Scattered policy → one deep module.** The same guard / null-check / formatting / retry logic
   copy-pasted across N call sites. Concentrate it behind one narrow interface; the callers shrink to
   an intent-expressing line. High-locality win — count the call sites as evidence.

3. **Temporal coupling → an interface that enforces order.** Two calls that must happen in sequence
   ("init then use", "lock then write") with the order held only by convention. Deepen into one
   module whose interface makes the wrong order unrepresentable.

4. **Leaky pair → a narrow seam.** Two modules that share mutable state or reach into each other's
   internals. They don't have a seam yet — give them one honest interface and hide the shared state
   behind it.

5. **Testability extraction that lost locality → re-deepen.** Pure helpers pulled out only to be
   unit-tested, while the real bug lives in the orchestration that calls them. Fold the logic back
   into a deep module and test *through its interface* instead.

6. **Config/flag sprawl → a deep configuration module.** The same env-var / option lookups threaded
   through many modules. Concentrate resolution behind one interface that returns validated,
   typed config.

## The interface-design walk (step 3)

After the user picks a candidate, design *with* them before writing code. Work through the steps below
in order, and apply the optional doc side-effects (last section) as each decision lands.

1. **Restate the deepening in one sentence** and confirm it's still what they want.
2. **Name the interface** — everything a caller must know: the operations, the invariants, the error
   modes, the ordering. Keep it *narrow*; every obligation you add to the interface is depth you lose.
3. **Decide what sits behind the seam** — the state, the policy, the dependencies the module now
   owns and the callers stop knowing about.
4. **Check the seam is real** — is there a second adapter (a test double counts if it's genuine, a
   real alternate implementation is stronger)? One adapter = don't build the seam yet; deepen without
   the indirection.
5. **List the tests that survive and the ones now newly possible** — the interface is the test
   surface. If the deepening doesn't improve what you can test through the interface, question it.
6. **Name the migration** — how the N callers move to the new interface, and whether it's one step or
   incremental.

Offer 2–3 interface shapes when the design is genuinely open (a function vs. a small object vs. a
strategy seam), with the trade-off in leverage/locality terms — then let the user choose. Don't
present one option as if it were the only one when it isn't.

## Optional doc side-effects (only when the doc already exists or the user opts in)

These keep the domain language and the code in sync. They are *optional* — this skill never requires
a `CONTEXT.md` or an ADR to function, and never creates the apparatus uninvited.

- **Naming a module after a concept absent from `CONTEXT.md`** (and `CONTEXT.md` exists) → offer to
  add the term with a one-line definition, so the next reviewer speaks the same language. Create the
  file only if the user asks.
- **User rejects a candidate for a load-bearing, durable reason** (and `docs/adr/` exists) → offer to
  record an ADR: *"Want this as an ADR so future architecture reviews don't re-suggest it?"* Only when
  a future explorer would actually need the reason to avoid re-proposing the same thing. Skip
  ephemeral ("not now") and self-evident reasons.

## Verify before you claim done

Same gate as the review skill. After implementing the deepening:
- run the tests that should still pass (through the new interface) and read the output;
- run any new test the deepening makes possible;
- if there's no test command, say so — "deepened `orderStore`; no test command found, unverified" is
  honest; "done" without a run is not.

Never write "refactor complete" or "tests pass" without having run the proving command in this turn.
