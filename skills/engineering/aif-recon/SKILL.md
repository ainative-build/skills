---
name: aif-recon
description: "Fast, token-efficient codebase reconnaissance. Given a task, a set of changed files, or a question, it finds the relevant files, their dependents/callers, related tests, and any governing spec/PRD/issue — and returns one concise context report. Divides the tree across parallel subagents when available, falls back to a single sequential sweep otherwise. Use before implementing, debugging, or reviewing, or whenever you need to know where something lives. Triggers on: 'find', 'locate', 'where is', 'scout', 'recon', 'map the codebase', 'gather context', 'what touches'."
license: MIT
metadata:
  author: ainative-build
  version: "1.0.0"
argument-hint: "<task | changed-files | question> [--spec]"
---

# aif-recon

Reconnaissance for the codebase: turn a target into a concise map of what's relevant. Built to feed
other work (implementation, debugging, review) a tight context report instead of a raw file dump.

**Principles:** wide-then-deep · divide and conquer · report signal, not noise.

Self-contained — built-ins only: `git`, `Glob`, `Grep`, `Read`, `Bash`, and (where available) the
`Task` tool for parallel subagents. Read-only; never edits.

## What it answers

Given a **target** — a task description, a set of changed files, or a plain question — produce:

- **Relevant files** — the modules that implement or own the target area.
- **Dependents / callers** — what refers to the changed/target symbols (blast radius).
- **Related tests** — test files that cover the target modules.
- **Spec / governing docs** — with `--spec` (or when asked), the PRD / issue / plan that defines the
  intended behavior.

## Workflow

```
1. Frame the target → search terms, entry dirs, symbols
2. Wide sweep       → Glob/Grep to size the space + gather candidates
3. Divide & conquer → parallel subagents over disjoint dirs (or one sequential sweep)
4. Deep read        → confirm the true owners; trace dependents & tests
5. Report           → one concise context report
```

### 1. Frame the target
Parse the target into concrete search terms: symbol/function/type names, file-type globs, likely
directories. For a changed-files target, start from `git diff --name-only` and the changed symbol
names. For a question, extract the nouns that name features/modules.

### 2. Wide sweep
Use a spread of `Glob` and `Grep` patterns to (a) estimate scale (how many files/dirs matter) and
(b) collect candidate files. Prefer several narrow patterns over one broad one.

### 3. Divide & conquer — capability branch (load-bearing for portability)
- **If parallel subagents are available** (Task tool): split the candidate directories into disjoint
  segments with NO overlap, and spawn one read-only subagent per segment. Give each the exact dirs/
  globs to read and the target it's confirming. Each returns a short segment report. Skip the fan-out
  when the candidate set is small (≤ ~2 segments) — the overhead isn't worth it; sweep inline.
- **Otherwise** (Codex, Cursor, or any runtime without subagents): do ONE sequential sweep in this
  session over the candidate set. Same output, just serial.

Each subagent (or the sequential sweep) must:
- read only its assigned scope; stay within it,
- confirm which candidates truly own the target (open them, don't guess from names),
- for changed/target symbols, Grep the repo for callers/importers (dependents),
- note the test files that exercise those modules,
- return a concise segment summary, not raw file contents.

### 4. Deep read
Merge segment reports. Open the top owners to confirm. Resolve the dependent set (who breaks if this
changes) and the covering tests. Drop false candidates.

### 5. Spec discovery (`--spec`, or when the caller asks)
Locate the governing spec in this order and report what you find (or "none found"):
1. Issue/PR references in the relevant commit messages (`#123`, `JIRA-45`, "closes …").
2. A path the caller named.
3. A scan of `docs/`, `specs/`, `.scratch/`, `plans/`, `PRD*`, `RFC*` for a matching document.

## Report format

Keep it tight — this is fuel for the next step, not an essay.

```markdown
# Recon — <target>

## Relevant files
- `path/to/file` — what it owns, why it's relevant

## Dependents / blast radius
- `path/to/caller` — how it depends on the target

## Tests
- `path/to/test` — what it covers

## Spec / governing docs        (when --spec or asked)
- `path/to/spec` — the requirement it defines   (or: none found)

## Notes & unresolved questions
- gaps, ambiguities, things the caller should confirm
```

## References

- `references/scouting-patterns.md` — Glob/Grep pattern recipes + how to size and split the tree.

## Notes

- Timebox parallel subagents (~3 min each); log any non-responder in the report rather than blocking.
- Each subagent has a bounded context window — hand it a scope it can actually read, not the whole
  tree.
