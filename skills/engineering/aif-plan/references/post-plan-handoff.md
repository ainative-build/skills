# Post-Plan Handoff Protocol

Always finish plan authoring with an explicit handoff so the user or orchestrator knows how to execute the plan.

## Handoff Template

```markdown
### Plan Summary
- **Plan Path**: `{relative-plan-dir}/plan.md`
- **Handover Contract**: `--chef` — phased tasks with success criteria, mechanical verification, and a per-phase Failure Protocol (when `--chef` is active; see `references/chef-handover-plan.md`)
- **Status**: Ready for implementation (`ready to serve`)
- **Phases**:
  1. Phase 1: [Phase 1 Title] — [Short description]
  2. Phase 2: [Phase 2 Title] — [Short description]

### Next Recommended Step
To execute this plan:
```bash
/aif-serve {relative-plan-dir}/plan.md
```
```

## Handover under `--chef`

When `--chef` is active:
- Keep the **Handover Contract** row shown in the template above; it names the phased-task, success-criteria, mechanical-verification, and per-phase Failure Protocol shape the executor must honor.
- Recommend running `/aif-serve {relative-plan-dir}/plan.md --chef` so advisory supervision carries forward.
