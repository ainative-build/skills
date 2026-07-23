# Module depth — the working vocabulary

Use these words precisely — a candidate that drifts vocabulary is a candidate that gets misread. Don't
substitute "component", "service", "layer", or "boundary" when one of these is meant. The lens comes
from Ousterhout's *A Philosophy of Software Design* (deep modules); the phrasing here is this skill's
own.

## Terms

- **Module** — anything with an interface and an implementation: a function, a class, a package, a
  vertical slice. Size-agnostic.
- **Interface** — *everything a caller must know to use the module correctly*: the type signature,
  yes, but also its invariants, error modes, ordering requirements, side effects, and configuration.
  The signature is the small part; the obligations are the rest.
- **Implementation** — the code behind the interface.
- **Depth** — how much behavior sits behind how small an interface.
  - **Deep** — a lot of behavior, a narrow interface. High leverage; the caller says what it wants
    and the module carries the weight.
  - **Shallow** — the interface is nearly as wide as the implementation. It hides almost nothing, so
    the caller has to understand it all anyway. A pass-through with extra steps.
- **Seam** — the place an interface lives; where behavior can be swapped without editing callers in
  place. (Use "seam", not "boundary".)
- **Adapter** — a concrete thing that satisfies an interface at a seam.
- **Leverage** — what *callers* get from depth: they express intent in one line and the module does
  the hard part.
- **Locality** — what *maintainers* get from depth: the change, the bug, and the knowledge all
  concentrate in one place instead of smearing across the callers.

## The deletion test

The fastest way to tell deep from shallow. Imagine deleting the module and inlining it at every call
site:

- **Complexity vanishes** → it was a **pass-through** (shallow). It added an interface without hiding
  anything. Candidate to remove or to deepen so it actually earns the interface.
- **Complexity reappears, duplicated across N callers** → it was **earning its keep** (deep). Leave
  it; it's concentrating complexity, which is the job.

Run it for real where you can: grep the call sites, count them, look at what each would have to
reconstruct. `[Verified]` beats `[Reasoned]` — a caller count is one `grep -c` away.

## Principles that rank candidates

- **The interface is the test surface.** Prefer deepening a module so it can be tested *through* its
  interface over extracting pure helpers just to test them directly. A helper pulled out only for
  testability often leaves the real bug in *how it's called* — and loses locality.
- **One adapter is a hypothetical seam; two adapters is a real one.** Don't propose a seam (an
  interface, an injection point, a strategy) for a single implementation. Add the seam when a second
  adapter actually exists or is imminent — otherwise it's speculative depth that costs indirection
  now for flexibility you may never use (YAGNI).
- **Deep beats many-shallow.** If understanding one concept means bouncing between five tiny modules,
  the fix is usually to consolidate them into one deep module, not to add a sixth.
- **Coupling leaks are shallowness in disguise.** Two modules that reach across each other's seam
  (shared mutable state, order-of-call assumptions, knowledge of each other's internals) don't have a
  real seam yet. Deepening means giving them one narrow, honest interface.

## What is NOT a deepening opportunity

Signal over volume — don't propose:

- Renames, formatting, or style (a linter's job).
- Splitting a module that is already deep just because it's long.
- Adding a seam "for future flexibility" with a single adapter (speculative).
- Re-litigating a decision recorded in `docs/adr/` unless the friction genuinely warrants reopening
  it — and then say so, don't sneak it in.
- Extraction that trades locality for a testable-in-isolation helper the callers now have to
  orchestrate themselves.
