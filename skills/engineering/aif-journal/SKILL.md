---
name: aif-journal
description: "Write chronological technical journals that preserve work history without replacing current docs or ADRs."
when_to_use: "Invoke for session reflection or change analysis."
category: workflow
keywords: [journal, reflection, changes, session]
argument-hint: "[topic or reflection]"
license: MIT
metadata:
  author: ainative-build
  version: "1.3.1"
---

# Journal

Capture a concise technical journal for the current session, then persist it with the journal script.

`<aif-journal>` below means this skill's directory and `<aif-plan>` means the installed aif-plan skill directory, a sibling of this skill. `journal.cjs` needs aif-plan installed next to it, because it reads `.aif.json` preferences through `<aif-plan>/scripts/prefs.cjs`.

Journals are work history under the `journal.dir` preference (`plans/journals/` by default). They are not durable product or decision authority — record lasting decisions in the project's ADR or current docs owner.

## Workflow

1. Gather the important events: root cause, key changes, impacts, decisions, and next steps.
2. Draft a short title and body (markdown). Prefer concrete errors, paths, and outcomes over vague summaries.
3. Persist with the script (scriptable; no `$EDITOR`):

```bash
node <aif-journal>/scripts/journal.cjs create "<title>" --summary "<one-line summary>" --stdin <<'EOF'
## What happened
...

## Decision
...

## Next steps
...
EOF
```

Optional flags: `--date YYYY-MM-DD`, `--tags a,b`, `--body-file <path>` instead of `--stdin`, and `--json` for machine-readable output.

4. Validate when needed:

```bash
node <aif-journal>/scripts/journal.cjs validate <slug-or-filename-stem>
```

5. Browse existing entries with `journal.cjs list` / `journal.cjs show <slug>`.

**Optional:** Invoke the `aif-journal-writer` subagent when emotional honesty and failure archaeology are the point of the entry; still persist through `journal.cjs create`.

## Naming

Created files use `YYYY-MM-DD-<slug>.md` with `-2`, `-3`, … collision suffixes.

## Workflow Position

**Typically follows:** `/aif-serve` (journal after implementation), `/aif-fix` (journal after bug fix)
**Related:** `aif-ship` (journal after shipping)
**Terminal skill** — no typical successor.

## Journal step — opt-out

Explicit `/aif-journal` and `journal.cjs create` are always available and are
unaffected by any preference or flag.

The **automatic** journal step at the end of the `aif-plan`, `/aif-serve`,
`/aif-fix`, and `aif-ship` skills honors:
- The `--skip-journal` flag on the invoking skill.
- The `journal.auto` preference (default: `true`).
  Set with: `node <aif-plan>/scripts/prefs.cjs set journal.auto false` (add `--user` for `~/.aif.json`; `true` re-enables).

Precedence when a workflow decides whether to run the automatic step: flag >
project config > user config > default (`true`). When the automatic step is
skipped, workflows print one line so the intent stays visible in output:
- `journal skipped by --skip-journal` (flag), or
- `journal skipped by preference` (config).

Reuse `journal.auto` already resolved by the calling workflow in this session; resolve it
only if missing or configuration changed.
