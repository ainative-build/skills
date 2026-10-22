# Plan Creation & Organization

## Directory Structure

### Plan Location

Use `Plan dir:` from the `## Naming` section when the session hook injected one; otherwise `plan.cjs create` computes the path from `plans.dir` and `plans.naming`.

Default scope:
- project scope → `plans/<timestamp>-authentication/`
- global scope → `{configured-global-plans-root}/<timestamp>-authentication/`
  - Default when unset: `~/.claude/plans/<timestamp>-authentication/`

Use global scope only when `--global` is explicit or there is no project context.

### File Organization

In the active scope root:
```
{plan-dir}/                                    # From `Plan dir:` in ## Naming
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── scout-report.md
│   ├── researcher-report.md
│   └── ...
├── plan.md                                    # Overview access point
├── phase-01-setup-environment.md              # Setup environment
├── phase-02-implement-database.md             # Database models
├── phase-03-implement-api-endpoints.md        # API endpoints
├── phase-04-implement-ui-components.md        # UI components
├── phase-05-implement-authentication.md       # Auth & authorization
├── phase-06-implement-profile.md              # Profile page
└── phase-07-write-tests.md                    # Tests
```

### Task Hydration

After creating plan.md and phase files, hydrate tasks (unless `--no-tasks`):
1. Discover the live task-management surface
2. If available, mirror phases, dependencies, and critical high-risk steps
3. Otherwise, keep progress in the active plan; see `task-management.md` for the cook handoff protocol

### Active Plan State Tracking

- Check `## Plan Context` injected by the session hook for active/suggested/none state, or run `plan.cjs resolve`
- After creating a plan, mark it active with `plan.cjs use <plan-dir>`
- Active plans use plan-specific reports path; suggested plans use default path

## Plan Creation Via Script

After determining phases from research/design:

1. **Scaffold:** Run `node <aif-plan>/scripts/plan.cjs create <slug> --title "<title>" --phases <n>`
   (see `cli-integration.md`), then do the mandatory read pass.

2. **Rename phase stubs** to `phase-NN-<name>.md` and update their links in the
   `plan.md` Phases table.

3. **Fill content sections** in plan.md via edit-file capability:
   - `## Overview` — brief description
   - `## Dependencies` — cross-plan dependencies

4. **Fill each phase-XX.md** with:
   - Architecture, implementation steps, success criteria
   - Requirements, risk assessment, security considerations

5. Change phase status with `plan.cjs phase update <phase-file> --status <s>`,
   which keeps the phase frontmatter and the Phases table row in sync.

Markdown plan creation goes through `plan.cjs create`. If it fails, report the
error; do not fall back to hand-scaffolding the directory.

## File Structure

### Overview Plan (plan.md)

Every `plan.md` needs YAML frontmatter — `plan.cjs` reads status from it, and `plan.cjs validate` rejects a plan without it. See `output-standards.md` for the schema.

**Example plan.md structure:**
```markdown
---
title: "Feature Implementation Plan"
description: "Add user authentication with OAuth2 support"
status: pending
priority: P1
effort: 8h
issue: <issue-number>
branch: <owner>/feat/<feature-name>
tags: [auth, backend, security]
blockedBy: []
blocks: [global:<timestamp>-user-dashboard]
created: <date>
---

# Feature Implementation Plan

## Overview

Brief description of what this plan accomplishes.

## Cross-Plan Dependencies

| Relationship | Plan | Status |
|-------------|------|--------|
| Blocks | `global:<timestamp>-user-dashboard` | pending |

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup Environment](./<setup-phase>.md) | Pending |
| 2 | [Core Implementation](./<implementation-phase>.md) | Pending |
| 3 | [Testing & Validation](./<test-phase>.md) | Pending |

<!-- IMPORTANT: Link text MUST be human-readable names (not filenames).
     Bad:  [phase-01-setup.md](./<setup-phase>.md)
     Good: [Setup Environment](./<setup-phase>.md) -->

## Dependencies

- List key dependencies here
```

Reference rules:
- Bare refs stay in the current scope.
- Use `global:` or `project:` when the dependency crosses scopes.
- `plan.cjs status <plan-dir>` reports plan and phase status.

**Guidelines:**
- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

### Phase Files (phase-XX-name.md)
Discover and follow the consuming repository's instruction and development-standard documents. Do not assume a fixed docs path.
Each phase file should contain:

**Context Links**
- Links to related reports, files, documentation

**Overview**
- Priority
- Current status
- Brief description

**Key Insights**
- Important findings from research
- Critical considerations

**Requirements**
- Functional requirements
- Non-functional requirements

**Architecture**
- System design
- Component interactions
- Data flow

**Related Code Files**
- List of files to modify
- List of files to create
- List of files to delete

**Implementation Steps**
- Detailed, numbered steps
- Specific instructions

**Todo List**
- Checkbox list for tracking

**Success Criteria**
- Definition of done
- Validation methods

**Risk Assessment**
- Potential issues
- Mitigation strategies

**Security Considerations**
- Auth/authorization
- Data protection

**Next Steps**
- Dependencies
- Follow-up tasks

### Deep / TDD Extensions

When `--deep` is used, add:
- a file inventory table with action, rough size, and test impact
- a test scenario matrix for critical, high, and medium paths
- a dependency map that calls out links to other phases

When `--tdd` is used, add:
- a **Tests Before** section for regression coverage written first
- a **Refactor** section describing the protected code changes
- a **Tests After** section for new behavior introduced in that phase
- a regression gate listing the compile/test command that must pass
