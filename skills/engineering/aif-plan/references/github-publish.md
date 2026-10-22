# GitHub Publishing (`--github`)

## GitHub Issue Integration (`--github`)

When `--github` is passed, create or update a GitHub issue after plan validation and red-team gates:

1. **Prerequisites**: Ensure `gh` CLI is installed and authenticated (`gh auth status`). If unauthenticated, report the error without failing plan creation.
2. **Issue Content**:
   - Issue Title: `Plan: {plan-title}` (or comment on source issue if one exists).
   - Plan Summary: Objectives, phases roadmap, estimated effort.
   - Links: Repo-relative link to `plan.md`.
   - Labels: Apply `ready to review` label after gates pass.
3. **Record**: Store the issue number with `node <aif-plan>/scripts/plan.cjs update <plan-dir> --issue <n>` so `plan.cjs resolve --issue <n>` finds the plan later.
