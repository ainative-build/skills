# Release Workflow

Load this reference for Steps 6-8. The main ship workflow owns ordering.

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

## Step 8: Docs update

Skip for `--skip-docs` or beta mode. Otherwise spawn an `aif-docs-manager`
subagent in the background with the shipped diff, asking it to update the
project docs the change affects, and continue without waiting.
