# Archive Workflow

## Your mission
Read and analyze the plans, then archive specific plans or all plans in the plans directory (the `plans.dir` preference, `.aif/plans/` by default).

## Plan Resolution
1. If `$ARGUMENTS` provided → Use that path
2. Else read all plans in the plans directory

## Workflow

### Step 1: Read Plan Files

Read the plan directory:
- `plan.md` - Overview and phases list
- `phase-*.md` - 20 first lines of each phase file to understand the progress and status

### Step 2: Ask user to confirm the action before archiving these plans
Use `ask_user capability` tool to ask if user wants to proceed with archiving these plans, select specific plans to archive or all completed plans only.

Archiving is an **index-visibility change, not file deletion**. The plan `.md`
files are canonical repo history and stay on disk. Do NOT offer, and never run, a
`rm -rf`/permanent-delete of a plan folder — that discards versioned history and
is exactly the "stale plan read as false context" harm this workflow avoids.

### Step 3: Archive the plans
Archive by changing index visibility, never by touching files:
- Run `node <aif-plan>/scripts/plan.cjs archive <plan-dir>` (and/or
  `plan.cjs cleanup --older-than <duration>` for a retention sweep of stale
  closed plans — a dry run unless `--apply` is passed).
- These mark the plan archived in `$AIF_HOME/plans-state.json` (default `~/.aif`). They do NOT move
  or delete the `plan.md`/`phase-*.md` files.
- Physically removing a plan folder is a separate, explicit user action only,
  and only after the plan is closed or archived and its files are
  committed. The user runs `git rm -r .aif/plans/<plan-dir>` themselves —
  `git rm` refuses untracked paths and preserves history for tracked ones, so it
  cannot silently destroy uncommitted work. Never fall back to `rm -rf`: if
  `.aif/plans/` is gitignored in the consuming repo, deletion is unrecoverable. Never
  a skill default, never a broad-glob delete.
- If the script fails, report the error and leave the files untouched; do not
  hand-move plans into an `.aif/plans/archive` directory.

### Step 4: Ask if user wants to commit the changes
Use `ask_user capability` tool to ask if user wants to commit the changes with these options:
- Stage and commit the changes (Use `/aif-git` for commit flow)
- Commit and push the changes (Use `/aif-git` for push flow)
- Nah, I'll do it later

## Output
After archiving the plans, provide summary:
- Number of plans archived (state only; files kept on disk)
- Table of plans that are archived (title, status, created date, LOC)

## Important Notes
- Only ask questions about genuine decision points
- Lead with the outcome. Keep reports short by being selective, not by compressing the writing into fragments or arrow chains; write complete sentences.
- List any unresolved questions at the end
