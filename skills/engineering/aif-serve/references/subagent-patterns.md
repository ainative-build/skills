# Subagent Patterns

Standard patterns for spawning and using subagents in serve workflows.

## Delegation Capability Pattern
```
delegate_agent capability(subagent_type="[type]", prompt="[task description]", description="[brief]")
```

## Research Phase
```
delegate_agent capability(subagent_type="aif-researcher", prompt="Research [topic]. Report ≤150 lines.", description="Research [topic]")
```
- Use multiple researchers in parallel for different topics
- Keep reports ≤150 lines with citations

## Scout Phase
```
delegate_agent capability(subagent_type="aif-recon", prompt="Find files related to [feature] in codebase", description="Scout [feature]")
```
- Use `/aif-recon ext` (preferred) or `/aif-recon` (fallback)

## Planning Phase
```
delegate_agent capability(subagent_type="aif-planner", prompt="Create implementation plan based on reports: [reports]. Save to [path]", description="Plan [feature]")
```
- Input: researcher and scout reports
- Output: `plan.md` + `phase-XX-*.md` files

## UI Implementation
```
delegate_agent capability(subagent_type="aif-ui-ux-designer", prompt="Implement [feature] UI per the project's discovered design guidance", description="UI [feature]")
```
- For frontend work
- Follow design guidelines

## Testing
```
delegate_agent capability(subagent_type="aif-tester", prompt="Run test suite for plan phase [phase-name]", description="Test [phase]")
```
- Must achieve 100% pass rate

## Debugging
```
delegate_agent capability(subagent_type="aif-debugger", prompt="Analyze failures: [details]", description="Debug [issue]")
```
- Use when tests fail
- Provides root cause analysis

## Code Review
```
delegate_agent capability(subagent_type="aif-code-reviewer",
     prompt="Review changes for [phase] against these MANDATORY checks: (a) every acceptance criterion met; (b) no regression to business logic in touchpoints/blast-radius from scout; (c) no breaking changes to public contracts (signatures, schemas, APIs, env vars) unless explicitly called out; (d) follows existing patterns from scout; (e) no new lint/type/build errors anywhere. CONTEXT — scout summary: <scout-summary>; acceptance criteria: <acceptance-criteria>. Return score (X/10), critical, warnings, suggestions, and explicitly flag any side effects to trigger HARD-GATE-NO-SIDE-EFFECTS.",
     description="Review [phase]")
```

## Conditional Simplify
```
delegate_agent capability(subagent_type="aif-code-simplifier", prompt="Simplify these files while preserving behavior exactly: [file-list]", description="Simplify recent edits")
```
- Trigger when live `git diff --numstat HEAD --ignore-all-space` breaches any
  threshold: 400 changed lines, 8 files, or 200 lines in a single file
- Scope the prompt to `git diff --name-only HEAD`
- Verify with `git diff --shortstat HEAD -- [file-list]` before/after the subagent;
  do not rely on the agent's prose summary
- Skip when the user asked not to simplify

## Plan Sync-Back
At Finalize (inline, not a subagent), reconcile the active plan with
`node <aif-plan>/scripts/plan.cjs` per `plan-state-files-first.md`: tick the boxes the
diff proves done (`plan.cjs check <phase-file>`), set phase and plan status with
`plan.cjs phase update` / `plan.cjs update --status`, and report any phase whose state
could not be mapped.

## Documentation
```
delegate_agent capability(subagent_type="aif-docs-manager", prompt="Update docs for [phase]. Changed files: [list]", description="Update docs")
```

## Git Operations
```
delegate_agent capability(subagent_type="aif-git-manager", prompt="Stage and commit changes with conventional commit message", description="Commit changes")
```

## Parallel Execution
```
delegate_agent capability(subagent_type="aif-fullstack-developer", prompt="Implement [phase-file] with file ownership: [files]", description="Implement phase [N]")
```
- Launch multiple for parallel phases
- Include file ownership boundaries
