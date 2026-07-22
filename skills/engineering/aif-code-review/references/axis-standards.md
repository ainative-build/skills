# Axis 1 — Standards / Quality

**Question this axis answers:** does the change follow sound engineering conventions and avoid
structural decay?

Runs in isolation from the Spec and Adversarial axes. Report findings under their own heading; do
not rank against the other axes' findings.

## Inputs (from the context pack)

- The pinned review target for the mode, fetched by command inside this pass: `git diff
  $BASE_SHA $HEAD_SHA` (committed modes), the snapshot patch `$PATCH_FILE` (pending), or the
  `git ls-files` scope (codebase — review whole files, there is no diff).
- Any project standards docs discovered by the orchestrator (`.editorconfig`, `docs/code-standards`,
  linter configs, `CONTRIBUTING`, existing nearby modules).

**Repo conventions override generic rules.** If the surrounding code has an established pattern,
consistency with it beats a textbook ideal. Flag a deviation from the repo's own norm before you
flag a deviation from a generic best practice.

## What to check

### Structure, logic, types, performance
- Organization and modularity: is new logic in a sensible place, or bolted onto the wrong module?
- Correctness of the happy path and the obvious edge cases (empty, zero, negative, boundary).
- Type safety and error handling at the seams.
- Performance smells visible in the diff: N+1 access, work inside a hot loop, needless re-computation.

### Code smells (Fowler, *Refactoring* ch. 3)
Scan the added/modified code for these; name the smell and the `file:line`:

1. Mysterious Name — a name that doesn't say what the thing does.
2. Duplicated Code — same structure in more than one place.
3. Long Function / Long Parameter List.
4. Global / shared mutable Data.
5. Divergent Change — one module changed for many unrelated reasons.
6. Shotgun Surgery — one change forces edits across many modules.
7. Feature Envy — a function more interested in another module's data than its own.
8. Data Clumps — the same group of fields traveling together everywhere.
9. Primitive Obsession — primitives where a small type would carry meaning.
10. Repeated Switches — the same switch/if-ladder duplicated.
11. Message Chains — `a.b().c().d()` coupling to a deep structure.
12. Middle Man / Refused Bequest — needless delegation, or a subclass rejecting its inheritance.

## Output

Per the shared output format: a `## Standards` section with severity-bucketed findings
(each `file:line` + one-line problem + fix approach), and the single most-significant Standards
issue called out. If clean: "No Standards findings." One line, done.
