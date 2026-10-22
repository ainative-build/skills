# Troubleshooting

## "Helper ran but no new tab appeared"

Possible causes:

1. **Chrome is not running.** The skill works by IPC'ing to a running Chrome that holds the user-data-dir SingletonLock. If no Chrome is open, the second binary starts a fresh Chrome — same end result (tab opens in target profile), but a new window appears.
2. **Wrong user-data-dir.** The skill defaults to the OS-standard user-data-dir. If the user runs Chrome with a custom `--user-data-dir`, the helper's `--profile-directory` won't match. Workaround: launch the user's Chrome with the standard dir, or extend the CLI to accept `--user-data-dir`.
3. **Profile directory was renamed/deleted.** `Local State`'s `info_cache` got out of sync. Re-run `chrome-profile setup`.

## "Agent picked the wrong tab"

The agent should bind to the exact `cdp-open=<token>` marker printed by `chrome-profile` or returned as `bind_selector` by `chrome-profile open --json`. Common pitfalls:

- The agent matched only `cdp-profile=<key>`, so it selected an old tab from a previous run in the same profile.
- The agent used MCP `new_page` or `navigate_page`, which created or changed a tab in whichever profile/page the bridge currently targeted.
- An SPA navigated away and overwrote `location.hash`. Always capture the pageId immediately after `list_pages` post-spawn; do NOT re-resolve later.

Fix: rerun `chrome-profile open --json <key> <url>`, list MCP pages immediately, select the page whose URL contains the returned `bind_selector`, then verify the selected URL also contains `profile_marker`.

## "Fragment was stripped by the page"

Some single-page apps assign `location.hash` for routing. After the SPA loads, `cdp-profile=<key>` may be replaced. The pageId is still valid — bind to it once and stop matching by URL.

If the target site is known to rewrite the hash, prepend a sentinel path that the SPA can't strip. Example: use `https://example.com/?_anchor=<key>` (query string) instead of fragment, accepting that the marker reaches the server.

## "Cookies are empty / not logged in"

Verify the user-data-dir Chrome is using:
```
chrome://version  →  Profile Path
```

If the path is not the original user-data-dir, you are running against a fresh profile. Re-launch Chrome without overriding `--user-data-dir`, or use the right user-data-dir.

If the path IS correct but cookies are still empty:
- Did you copy the profile to a different path? Don't. Cookies on macOS won't decrypt at a new path. See `architecture.md`.
- Did the user sign out? Sign back in inside Chrome's UI.

## "chrome-devtools-mcp says Allow remote debugging again"

Normal. The MCP attaches per session. If the user has not chosen "Always Allow," they will be prompted each time the MCP starts. Tell the user to click "Always Allow" if they want persistent attach.

## "`doctor` needs a live probe, but Chrome DevTools MCP is available"

Treat `doctor` as a setup heuristic, not the final authority. If it reports `chrome_devtools_mcp_auto_connect` or `chrome_devtools_mcp_runtime_probe_required`, the CLI found a configured bridge candidate but still needs a runtime probe. If the current runtime exposes Chrome DevTools MCP tools, call the page-list tool once before blocking. The first call may trigger Chrome's remote-control approval prompt. After the user approves, retry the page-list call once.

If the retry succeeds, continue through that MCP bridge. If an older or mismatched `chrome-profile <key> <url>` still refuses because `doctor` reports `ok=false`, use `chrome-profile open --json <key> <url> --force` only for that proven fallback case, then immediately select the tab containing the returned `bind_selector`.

## "Chrome stole focus while opening the profile tab"

On macOS, use:

```bash
chrome-profile open --json <key> <url> --no-activate
```

or set:

```bash
export CHROME_PROFILE_NO_ACTIVATE=1
```

The CLI opens the tab through Chrome's normal profile IPC, waits briefly, then reactivates the app that was frontmost before launch. On Linux and Windows this flag is currently a no-op.

## "Helper output says python3 not found"

Install Python 3. macOS: `brew install python`. Linux: `apt install python3` / `dnf install python3`. Windows: `winget install Python.Python.3`.

## "Setup interactive prompt is unreadable in a non-TTY environment"

Run with `chrome-profile setup --yes` to accept all auto-derived keys. Then edit `~/.config/chrome-profile/profiles.json` by hand to rename keys.

## "I run multiple Chrome channels (stable + canary + beta)"

The skill currently targets stable Chrome. Each channel has a separate user-data-dir and binary. To handle multiple channels, install the skill twice with different `PREFIX` and modify the Python CLI to accept a `--channel` flag. Not built into the default skill — open an issue if needed.

## "I want to use this with Chromium / Brave / Arc / Edge"

The IPC mechanism is identical (it's a Chromium feature). Override the binary path and user-data-dir in the Python CLI, or set environment overrides:

- `CHROME_BIN=/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser`
- `CHROME_USER_DATA_DIR=$HOME/Library/Application\ Support/BraveSoftware/Brave-Browser`

Not yet supported by the CLI — would require a small patch. Document by adding a "channel/binary" subcommand if it becomes a recurring need.
