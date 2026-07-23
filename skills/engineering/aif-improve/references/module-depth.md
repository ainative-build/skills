# Module depth — the working vocabulary

Use the terms below consistently — a candidate described in drifting words gets misread. Don't reach
for "component", "service", "layer", or "boundary" when one of the terms below is meant.
The underlying idea — that the strongest modules hide a lot of behavior behind a little interface — is
John Ousterhout's *deep module* from *A Philosophy of Software Design*. The definitions, tests, and
ranking rules below are this skill's working restatement of that idea for review purposes.

## Terms

- **Module** — anything with an interface and an implementation behind it: a function, a class, a
  package, a vertical slice. The idea is scale-free.
- **Interface** — the full set of things a caller must hold in their head to use the module correctly.
  The signature is the visible tip; the invariants, ordering rules, error modes, side effects, and
  configuration are the rest of it, and they count just as much.
- **Implementation** — whatever runs behind that interface.
- **Depth** — the ratio of behavior hidden to interface exposed.
  - **Deep** — much behind little. The caller states intent and the module absorbs the difficulty.
  - **Shallow** — the interface is about as wide as the code behind it, so it conceals almost nothing
    and the caller ends up owning the detail anyway.
- **Seam** — where an interface sits: the point at which you can swap one implementation for another
  without rewriting the callers. (Say "seam", not "boundary".)
- **Adapter** — a concrete implementation that plugs into a seam.
- **Leverage** — the caller's reward for depth: intent goes in, difficulty is handled, in one call.
- **Locality** — the maintainer's reward for depth: a change, a fix, or a fact to learn stays inside
  one module instead of being spread thin across every caller.

## The deletion test

The quickest way to separate deep from shallow. Picture removing the module and pasting its body into
every place that calls it:

- If the callers barely notice — nothing got harder — the module was **decoration** (shallow). It
  charged an interface and hid nothing. Remove it, or give it real work so the interface pays for
  itself.
- If each caller suddenly has to carry its own copy of the hard part — the difficulty comes back,
  multiplied by the call count — the module was **doing its job** (deep). It was holding complexity in
  one place, which is the whole point. Leave it alone.

Do it for real when you can: list the call sites, count them, and ask what each one would have to
rebuild. The `grep -c` count is `[Verified]` evidence; the shallow-vs-deep verdict it feeds is
`[Reasoned]` until you actually show the duplicated work — report the count as support, not as the
conclusion.

## Principles that rank candidates

- **Reach behavior through the interface; don't carve out helpers to test in isolation.** Deepening a
  module so its behavior is exercisable from the outside beats prying a pure function loose just to
  unit-test it — that move usually strands the real defect in the calling code and scatters what used
  to live in one place.
- **Hold off on a seam until a second implementation exists.** A seam with one thing plugged into it is
  a bet on the future; it earns its indirection only once a second adapter is actually present or
  clearly imminent. Before that, it costs indirection now for flexibility you may never spend (YAGNI).
- **One deep module beats a scatter of tiny ones.** When grasping a single idea means hopping through
  five little modules, merge them into one — don't add a sixth.
- **A coupling leak is shallowness in disguise.** When two modules share mutable state, depend on each
  other's call order, or reach into each other's internals, the seam between them isn't real yet.
  Deepening them means giving them one honest, narrow interface.

## What is NOT a deepening opportunity

Signal over volume — leave these alone:

- Renames, formatting, style — a linter's job.
- A long module that is already deep. Length is not the enemy; shallowness is.
- A seam proposed for a single adapter "in case we need it later" — a bet, not a need.
- A decision already recorded in `docs/adr/`, unless the friction genuinely justifies reopening it —
  and if so, say that out loud rather than quietly routing around it.
- Prying out a testable-in-isolation helper that leaves its callers to choreograph what the module
  used to handle.
