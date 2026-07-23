# Axis 1 — Standards / Quality

**Question this axis answers:** does the change follow sound engineering conventions and avoid
structural decay?

Runs in isolation from the Spec and Adversarial axes. Report findings under their own heading; do
not rank against the other axes' findings.

## Inputs (from the context pack)

- The pinned review target — run the command from the **Review Target block** verbatim (literal
  `git diff <BASE> <HEAD>` for committed modes, the snapshot patch for pending/PR, or the
  `git ls-files` scope for codebase — review whole files, there is no diff). Never re-derive the SHAs.
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

**Verify a structural smell with the deletion test.** When the diff *introduces or extends* a
Middle Man (pass-through wrapper), Duplicated Code, or a helper extracted only for testability,
don't just assert it — run the deletion test. Paste the wrapper/helper into its call sites in your
head and `grep -c` the callers: if nothing gets harder (the callers barely change), it's genuine
decoration and the smell stands; if each of the N callers inherits a copy of the hard part, the module
is doing real work — leave it. A caller count turns a `[Reasoned]` smell into a `[Verified]` one. Keep
this scoped to code the diff touches; a whole-repo depth audit belongs to `aif-improve`, not a diff
review.

### Checklists to apply
- `checklists/base.md` — the Pass-2 (non-blocking) quality/perf/test-gap/dead-code items are yours
  (the Pass-1 security items belong to the Adversarial axis). Apply the `api.md` / `web-app.md`
  overlays when their detection triggers.
- `anti-ai-slop.md` — the anti-slop lens (structural = High, micro = Low/Medium). This is a
  Standards concern; apply it, especially on AI-assisted diffs.
- `edge-cases.md` — probe and verify edge cases of changed functions.

## Output

Per the shared output format (`output-format.md` → Finding format): a `## Standards` section.
Write each Critical/High as a full titled block — headline, `file:line`, a plain-language
description, an **Evidence** table or line, **Root cause**, **Why it matters**, and **Fix**. Batch
Medium/Low as one-liners. Call out the single most-significant Standards issue. If clean: "No
Standards findings." One line, done.
