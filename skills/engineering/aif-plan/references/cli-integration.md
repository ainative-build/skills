# Script Integration & Plan Scaffolding

This skill orchestrates planning; `<aif-plan>/scripts/plan.cjs` scaffolds plan files and mutates plan and phase status. Every command accepts `--json`; run `node <aif-plan>/scripts/plan.cjs` with no arguments for the command list.

## Files-First Architecture

- `plan.md` + `phase-NN-*.md` under `<timestamp>-<slug>/` in the configured plans directory (`.aif/plans/` by default) ARE the plan.
- `plan.cjs` reads status from the files themselves. Lifecycle state (active, closed, archived), the active-plan pointer and GitHub ids live in `~/.aif/plans-state.json`; `plan.cjs reindex` reports state entries whose plan directory no longer exists.
- A GitHub issue is an optional visibility projection; plans remain fully functional as local files without GitHub.

## CLI Scaffolding Rules

- Scaffold with `node <aif-plan>/scripts/plan.cjs create <slug> --title "<title>" --phases <n>`. The directory name follows `plans.naming` from `.aif/config.json`.
- Default scope is project-local (`plans.dir`, `.aif/plans/` by default).
- Change status with `plan.cjs update <plan-dir> --status <s>` and `plan.cjs phase update <phase-file> --status <s>`; the phase command also updates the matching row in the `plan.md` Phases table. Tick tasks with `plan.cjs check|uncheck`.
- Set the active plan with `plan.cjs use <plan-dir>`; find it again with `plan.cjs resolve`.

## Mandatory Generated-File Read Pass

After scaffolding and before composing replacement content:
1. Enumerate generated files: `plan.md` plus all `phase-*.md`.
2. Read `plan.md`.
3. Read every generated `phase-*.md` stub, including future phases.
4. Write or edit the full content only after the read pass. Stubs are named `phase-NN-phase-N.md`; when you rename one to `phase-NN-<name>.md`, update its link in the `plan.md` Phases table in the same edit.

## Canonical Phase File Template

```markdown
---
phase: <N>
title: "<Phase Name>"
status: pending       # pending | in-progress | completed
priority: P2          # P1 | P2 | P3
effort: ""            # e.g. "4h", "2d"
dependencies: []      # phase IDs this blocks on
---

# Phase <id>: <Name>

## Goal
[One clear sentence defining what this phase accomplishes]

## Files to Create / Modify
- Create: `path/to/file.ts`
- Modify: `path/to/existing.ts`

## Tests First
<!-- Or: Tests First: not applicable — <reason> -->
- Characterization: [existing behavior this phase must not change] — `[test file]`
- New behavior: [acceptance criterion] — [unit|integration|e2e] — fails before implementation with: [expected assertion failure] — `[test file]`
- Stubs: [new modules/exports the red run needs, written by `aif-test` as signature-only stubs] or `none`
- Red: `[command that must fail for the reasons above]`
- Green: `[command that must pass after implementation]`

## Tasks & Steps
1. Write the Tests First tests and confirm the red run fails for the stated reasons
2. [Concrete actionable step]
3. [Concrete actionable step]

## Verification
- Green command passes, including every characterization test
- [Other command to verify]
```
