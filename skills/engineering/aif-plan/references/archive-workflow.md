# Archive Workflow

## Your mission
Read and analyze the plans, then write journal entries and archive specific plans or all plans in the `plans` directory.

## Plan Resolution
1. If `$ARGUMENTS` provided → Use that path
2. Else read all plans in the `plans` directory

## Workflow

### Step 1: Read Plan Files

Read the plan directory:
- `plan.md` - Overview and phases list
- `phase-*.md` - 20 first lines of each phase file to understand the progress and status

### Step 2: Summarize the plans and document them with `/aif-journal` skill invocation

Respect the shared "Journal step — opt-out" contract before prompting. Skip the
entire journal sub-step silently — do NOT ask — when either applies:
- The invocation includes the `--skip-journal` flag, OR
- `node <aif-plan>/scripts/prefs.cjs get journal.auto` prints `false`. If the command errors or prints anything other than the exact string `false`, treat as `true` (default) — corrupt or missing config never suppresses the automatic journal.

Precedence: flag > project config > user config > default (`true`). When
skipped, print one line and jump to Step 3:
- `journal skipped by --skip-journal` (flag), or
- `journal skipped by preference` (config).

Otherwise, use `ask_user capability` tool to ask if user wants to document journal entries or not.
Skip this step if user selects "No".
If user selects "Yes":
- Analyze the information in previous steps.
- Use delegate_agent capability with `subagent_type="aif-journal-writer"` in parallel to document all plans.
- Journal entries should be concise and focused on the most important events, key changes, impacts, and decisions.
- Keep journal entries in the `./plans/journals/` directory.
- Treat journals as chronological work records; move durable rules to current
  docs or ADRs.

### Step 3: Ask user to confirm the action before archiving these plans
Use `ask_user capability` tool to ask if user wants to proceed with archiving these plans, select specific plans to archive or all completed plans only.

Archiving is an **index-visibility change, not file deletion**. The plan `.md`
files are canonical repo history and stay on disk. Do NOT offer, and never run, a
`rm -rf`/permanent-delete of a plan folder — that discards versioned history and
is exactly the "stale plan read as false context" harm this workflow avoids.

### Step 4: Archive the plans
Archive by changing index visibility, never by touching files:
- Run `node <aif-plan>/scripts/plan.cjs archive <plan-dir>` (and/or
  `plan.cjs cleanup --older-than <duration>` for a retention sweep of stale
  closed plans — a dry run unless `--apply` is passed).
- These mark the plan archived in `~/.aif/plans-state.json`. They do NOT move
  or delete the `plan.md`/`phase-*.md` files.
- Physically removing a plan folder is a separate, explicit user action only,
  and only after the plan is closed or archived, journaled, and its
  files are committed. The user runs `git rm -r ./plans/<plan-dir>` themselves —
  `git rm` refuses untracked paths and preserves history for tracked ones, so it
  cannot silently destroy uncommitted work. Never fall back to `rm -rf`: if
  `plans/` is gitignored in the consuming repo, deletion is unrecoverable. Never
  a skill default, never a broad-glob delete.
- If the script fails, report the error and leave the files untouched; do not
  hand-move plans into an `./plans/archive` directory.

### Step 5: Ask if user wants to commit the changes
Use `ask_user capability` tool to ask if user wants to commit the changes with these options:
- Stage and commit the changes (Use `/aif-git` for commit flow)
- Commit and push the changes (Use `/aif-git` for push flow)
- Nah, I'll do it later

## Output
After archiving the plans, provide summary:
- Number of plans archived (state only; files kept on disk)
- Table of plans that are archived (title, status, created date, LOC)
- Table of journal entries that are created (title, status, created date, LOC)

## Important Notes
- Only ask questions about genuine decision points
- Lead with the outcome. Keep reports short by being selective, not by compressing the writing into fragments or arrow chains; write complete sentences.
- List any unresolved questions at the end
