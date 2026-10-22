# Release Workflow

Load this reference for Steps 6-9. The main ship workflow owns ordering.

## Step 6: Version bump

1. Auto-detect the version source via `auto-detect.md`; skip when absent.
2. Default to patch for ordinary diffs. Ask whether to use minor or patch for a
   major feature or breaking change.
3. For beta mode, use the next prerelease suffix such as `1.2.4-beta.1`.
4. Write the selected version to the detected source.

## Step 7: Changelog

1. Find `CHANGELOG.md` or `CHANGES.md`; skip when absent.
2. Infer the entry from all target-to-head commits and the full diff. Do not ask
   the user to restate changes.
3. Categorize Added, Changed, Fixed, and Removed; insert a dated version entry
   after the file header.

## Step 8: Journal

Apply the shared **Journal step — opt-out** contract. Skip when
`--skip-journal` is present, or when this command returns the exact string
`false`:

```bash
node <aif-plan>/scripts/prefs.cjs get journal.auto
```

Command errors or any other output default to enabled. Precedence: flag,
project config, user config, then `true`.

Print `journal skipped by --skip-journal` or `journal skipped by preference`
when skipped. Explicit `/aif-journal` and `journal.cjs create` remain unaffected.

Otherwise invoke `/aif-journal` via a `aif-journal-writer` subagent in the
background. Include shipped changes, decisions, and technical challenges; save
the chronological record under the `journal.dir` preference (`plans/journals/` by default). Continue without waiting.

## Step 9: Docs update

Skip for `--skip-docs` or beta mode. Otherwise spawn an `aif-docs-manager`
subagent in the background with the shipped diff, asking it to update the
project docs the change affects, and continue without waiting.
