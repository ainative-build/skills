---
name: aif-improve
description: "Find architectural deepening opportunities in existing code — shallow modules to make deep, tightly-coupled modules to consolidate, seams worth adding for testability and AI-navigability. Judges depth with the deletion test and reports evidence-backed candidates ranked by recommendation strength, never touching code until you pick one. Optionally reads a domain glossary (CONTEXT.md) and decision records (docs/adr/) if the repo has them. Use for: 'improve the architecture', 'find refactoring opportunities', 'this module feels shallow', 'make X more testable', 'consolidate these modules', 'reduce coupling'. Triggers on: 'improve codebase', 'refactor opportunities', 'architecture review', 'deepen modules', 'aif improve'."
license: MIT
metadata:
  author: ainative-build
  version: "1.0.0"
argument-hint: "[<path|area> | whole repo] [--html]"
---

# aif-improve

Find where the structure of working code makes it harder to test and change than it needs to be, and
propose **deepenings** — changes that trade a pile of shallow modules for a smaller number of deep
ones. Every candidate carries evidence; no code changes until you pick one.

**Principles:** depth over extraction · evidence over taste · propose, don't touch.

This is not a diff review (that's `aif-code-review`) and not a task map (that's `aif-recon`). It
reads existing code and asks a different question: *where is the structure making this harder to
understand, test, and change than it needs to be — and what deeper shape would fix it?* `aif-code-review`
may hand off paths to this skill via its non-blocking **Deepening pointers** footer — a review that
kept bumping into pre-existing shallowness points here rather than restructuring inside a merge gate.

The lens is module **depth** (Ousterhout, *A Philosophy of Software Design*): a deep module hides a
lot of behavior behind a small interface. See `references/module-depth.md` for the working
vocabulary — use it exactly, so suggestions stay consistent.

Self-contained — built-ins only: `git`, `Glob`, `Grep`, `Read`, `Bash`, and (where available) the
`Task` tool for parallel exploration. Read-only in steps 1–2; step 3 edits code only after you pick
a candidate and agree the design.

## Workflow

```
1. Explore        → read optional domain docs, then walk the code for friction   (orchestrator)
2. Present        → evidence-backed candidates, ranked; ask which to pursue        (orchestrator)
3. Deepen         → design the interface with the user, then implement one         (orchestrator)
```

### 1. Explore

**Optional context first (only if present — never required):**
- `CONTEXT.md` / a domain glossary → use its nouns to name modules (the "Order intake module", not
  "the FooBarHandler"). If absent, name modules after what they do.
- `docs/adr/` (or `docs/decisions/`) → decisions already made. Do not re-litigate a settled ADR;
  only reopen one when the friction is real enough to warrant it, and say so explicitly.

**Explorer:** if the `aif-recon` skill is installed, use it to map the target area (pass the path or
area, no `--spec` needed). Otherwise scout inline: `Glob`/`Grep` to size the space, then read the
owners. On runtimes with the `Task` tool, fan out read-only `Explore` subagents over disjoint
directories; otherwise sweep sequentially.

Read through the target area the way you would to make a change, and note friction as you hit it —
don't grind a checklist:
- understanding one concept requires bouncing between many small modules (no **locality**);
- a module is **shallow** — its interface is nearly as wide as its implementation;
- pure functions were extracted only for testability, but the real bugs live in how they're *called*;
- tightly-coupled modules leak state or assumptions across their **seam**;
- a part of the codebase is untested, or can't be tested through its current interface.

Apply the **deletion test** (`references/module-depth.md`) to anything that smells shallow: paste it
into its callers in your head. If nothing gets harder, it was decoration — the deepening candidate you
want. If each caller inherits a copy of the hard part, it was already doing its job — leave it.

### 2. Present candidates

Do NOT design interfaces yet. Report per `references/opportunity-report.md`: each candidate as a card
with the modules involved, the friction (concrete `file:line` evidence), the deletion-test result,
the proposed deepening in plain English, the payoff in **leverage** + **locality** + test surface, a
before→after sketch, and a **recommendation-strength** badge (`Backed` / `Worth a look` /
`Speculative`). Carry over the evidence discipline from the review skill: every claim gets a
`[Verified]` (a grep/count/test you ran, with output) or `[Reasoned]` tag, and any candidate whose
value hinges on a fact you couldn't confirm gets a `> Conditional:` line.

End with a **Top recommendation** — which one to tackle first and why. Then ask the user: *"Which of
these would you like to pursue?"*

With `--html`, also write the self-contained visual report (`references/opportunity-report.md` →
HTML) to the temp dir and open it; markdown in chat stays the default.

### 3. Deepen a candidate

Once the user picks one, design the deeper module *with* them before writing code — see
`references/deepening-patterns.md`. Walk the interface: the constraints, what sits behind the seam,
which tests survive, what the caller no longer needs to know. Only cut a seam once a second
implementation is present or clearly imminent — a seam with one thing plugged into it is a bet, not a
need.

Side effects happen inline as the design settles, and only when the relevant doc already exists or
the user opts in:
- **Naming a module after a concept not in `CONTEXT.md`** (and `CONTEXT.md` exists) → offer to add
  the term, so the domain language and the code stay in sync.
- **User rejects the candidate for a load-bearing reason** (and `docs/adr/` exists) → offer to record
  an ADR, framed as *"so future architecture reviews don't re-suggest this"*. Skip ephemeral reasons
  ("not now") and self-evident ones.

Then implement the agreed change. Verify through the new interface — run the tests that should still
pass, and any new one the deepening makes possible. Never claim the refactor is done without running
the proving command and reading its output (same verification gate as the review skill).

## Input

| Invocation | Scans |
|-----------|-------|
| `aif-improve` | the whole repo (sampled — discloses coverage) |
| `aif-improve src/payments/` | a scoped path or area |
| `aif-improve "the auth flow"` | an area named in prose (resolved to files first) |
| `… --html` | also emit the visual before/after report to the temp dir |

For a whole-repo scan, disclose coverage honestly — "walked N of M modules, sampled by …" — and never
imply exhaustiveness you didn't reach.

## Tools used

Built-ins only: `git`, `Glob`, `Grep`, `Read`, `Bash`, plus the `Task`/`Agent` tool for parallel
exploration where available, and `Edit`/`Write` in step 3 only. On Codex/Cursor, map these to that
runtime's search / file-read / shell / edit equivalents — the capability is what matters, not the
name. Prefers the `aif-recon` skill for exploration when installed; falls back to inline scouting.

## References

- `references/module-depth.md` — the depth vocabulary (module, interface, depth, seam, leverage,
  locality) + the deletion test and the principles that rank candidates.
- `references/opportunity-report.md` — the markdown candidate-card format, recommendation strength,
  evidence rules, and the optional `--html` visual scaffold.
- `references/deepening-patterns.md` — common shallow→deep patterns and the interface-design walk for
  step 3, plus the optional CONTEXT.md / ADR side-effects.
