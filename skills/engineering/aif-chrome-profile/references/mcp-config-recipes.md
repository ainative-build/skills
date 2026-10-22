# MCP Bridge Recipes — making `chrome-profile` tabs readable by an agent

`chrome-profile <key> <url>` opens a tab in the named profile of your daily Chrome. To make the opened tab readable by an agent, Chrome DevTools MCP must be attached to **that same Chrome process**. This file lists the supported DevTools bridge patterns and how to configure each.

Run `chrome-profile doctor` first, but do not stop there if the current runtime exposes Chrome DevTools MCP tools. `doctor` is a static setup check; `chrome_devtools_mcp_auto_connect` and `chrome_devtools_mcp_runtime_probe_required` mean the CLI found a configured bridge candidate, but a live DevTools page-list or page-read call is still the reachability check that catches consent prompts and stale runtime state.

## Live probe before blocking

Before telling the user that the browser is not connected:

1. Try the Chrome DevTools MCP page-list tool exposed by the current runtime.
2. If Chrome asks whether to allow remote control, tell the user to approve it and retry the same tool call once.
3. If the page-list, snapshot, or page-read call succeeds, treat the bridge as reachable. If `doctor` reports `runtime_probe_required=true`, continue normally.
4. If an older or mismatched `chrome-profile <key> <url>` still refuses because of stale bridge classification, use `chrome-profile open --json <key> <url> --force` only after the live probe has succeeded, then select the tab whose URL contains the returned `bind_selector`.
5. Ask for setup or relaunch only after both `doctor` and the live probe fail.

---

## Recipe 1 — Chrome DevTools MCP auto-connect

**Why:** This keeps the workflow independent of runtime-specific browser extensions. The first DevTools MCP call can trigger Chrome's remote-control consent prompt, which is exactly why agents must try the tool before declaring the bridge unavailable.

### Install
1. Add Chrome DevTools MCP to the agent runtime's MCP config with auto-connect. Use the config format for the active host:

   Claude Code JSON:
   ```jsonc
   "mcpServers": {
     "chrome-devtools": {
       "command": "npx",
       "args": ["-y", "chrome-devtools-mcp@latest", "--autoConnect", "--channel=stable"]
     }
   }
   ```

   Codex TOML:
   ```toml
   [mcp_servers.chrome-devtools]
   command = "npx"
   args = ["-y", "chrome-devtools-mcp@latest", "--autoConnect", "--channel=stable"]
   enabled = true
   ```

2. Restart the agent session so the MCP loads.
3. Call the Chrome DevTools MCP page-list tool. If Chrome asks for remote-control approval, approve it and retry the same call once.

### Verify
```bash
chrome-profile doctor
# Static setup hint only. A live Chrome DevTools MCP page-list/read call is the final check.
```

Then run a live probe through the runtime's Chrome DevTools MCP tools. In Claude Code, for example:
- `mcp__chrome-devtools__list_pages` returns Chrome tabs.
- `mcp__chrome-devtools__select_page` + `evaluate_script`/`take_snapshot` read the tab.

### Limits
- The user may need to approve Chrome remote-control access on first use.
- If auto-connect cannot attach to the intended Chrome process, use Recipe 2 with an explicit endpoint.

---

## Recipe 2 — Chrome DevTools MCP attach or auto-connect

**Why:** Pure CDP. Works without a vendor-specific browser extension. Useful for CI, headless servers, or when auto-connect is not desired.

**Trade-off:** Requires relaunching daily Chrome with `--remote-debugging-port=9222`. **Closes all open tabs** unless session restore catches them. Genuinely costly if you have live work in tabs.

### One-time setup
```bash
# 1. Fully quit daily Chrome (Cmd-Q is NOT enough; this guarantees no helper survives):
osascript -e 'quit app "Google Chrome"'
sleep 3

# 2. Confirm nothing is holding :9222. If something is listening but /json/version
#    is not valid CDP, switch to Recipe 1 instead.
lsof -nP -iTCP:9222 -sTCP:LISTEN
# Expected: no output.

# 3. Relaunch daily Chrome with CDP enabled:
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --remote-allow-origins=*

# 4. Verify the endpoint is real CDP (not a squatter):
curl -s http://127.0.0.1:9222/json/version
# Expected: JSON containing "Browser" and "webSocketDebuggerUrl".
```

### Wire the MCP
Add the endpoint to the active runtime's MCP config.

Claude Code JSON:
```jsonc
"mcpServers": {
  "chrome-devtools": {
    "command": "npx",
    "args": ["-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://127.0.0.1:9222"]
  }
}
```

Codex TOML:
```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://127.0.0.1:9222"]
enabled = true
```

Restart the agent session.

### Verify
```bash
chrome-profile doctor
# Expected: bridge=chrome_devtools_mcp_attached, ok=true,
#           chrome_devtools_mcp.browser_url_configured=http://127.0.0.1:9222
```

Then run a live probe through the runtime's available tools. In Claude Code, for example:
- `mcp__chrome-devtools__list_pages` returns daily-Chrome tabs (across all profiles).
- `mcp__chrome-devtools__select_page` + `evaluate_script`/`take_snapshot` read the tab.

If this first tool call triggers Chrome's remote-control approval prompt, wait for the user to approve it and retry the same call before declaring failure.

### Do not confuse an open `:9222` with CDP

`lsof` showing Chrome on `127.0.0.1:9222` is not enough. The endpoint is usable
for `chrome-devtools-mcp --browserUrl` only when this returns HTTP 200 JSON with
`Browser` and `webSocketDebuggerUrl`:

```bash
curl -sS -D - --max-time 3 http://127.0.0.1:9222/json/version
```

If it returns `HTTP/1.1 404 Not Found`, remove the static `--browserUrl` MCP
config and use auto-connect instead. In Claude Code you can do that with:

```bash
claude mcp remove chrome-devtools -s user
claude mcp add -s user chrome-devtools npx -- -y chrome-devtools-mcp@latest --autoConnect --channel=stable
```

In Codex, edit the active Codex MCP TOML entry to use the auto-connect args from Recipe 1 instead of `--browserUrl`. Then restart the agent session and approve Chrome's remote-debugging prompt on that same machine.

### Rule out Tailscale or SSH leakage

Run these from the machine where the agent is running:

```bash
lsof -nP -iTCP:9222
tailscale serve status
tailscale funnel status
nc -G 2 -vz "$(tailscale ip -4)" 9222
nc -G 2 -vz <other-machine-tailnet-ip> 9222
ps -axww -o pid=,ppid=,command= | rg 'ssh .*-[LDR]|ssh .*9222|chrome-devtools-mcp'
```

Interpretation:
- `127.0.0.1:9222` listening but the tailnet IP refuses `:9222` means the port is
  local-only, not published through Tailscale.
- `No serve config` and `No funnel config` mean Tailscale is not publishing it.
- A debug prompt on another Mac means an MCP/agent running on that Mac asked its
  own Chrome for access, unless an SSH `-L`/`-R` process explicitly forwards
  `9222`.
- VS Code Remote SSH commonly uses `ssh -D <port>` SOCKS forwarding; that is not
  a `9222` leak by itself.

### Why `:9222` can be misleading

An occupied `:9222` does not prove CDP is available. If `/json/version` does not return Chrome DevTools JSON, prefer Recipe 1 and let Chrome DevTools MCP auto-connect trigger the browser consent flow.

---

## Recipe 3 — None (skip browser automation)

If neither recipe is set up, `chrome-profile <key> <url>` will **refuse** to open the tab by default (the agent would launch a tab no MCP can see - a confusing footgun). Override with `--force` only if you just want the tab open for yourself, or if a live MCP probe already proved that an older or mismatched CLI is under-classifying the bridge:

```bash
chrome-profile open --json personal https://example.com --force   # human-only, or live-probe-confirmed fallback
```

The skill's `cmd_open` runs `doctor` before launching. If `doctor` returns `ok=false` and `--force` is not passed, the command exits non-zero with the same remediation hints printed above. If `doctor` returns `runtime_probe_required=true`, the command may open without `--force`; the agent still has to prove reachability with the live MCP page-list/read probe.

For agent automation that needs a specific real Chrome profile, prefer:

```bash
chrome-profile open --json work https://example.com/dashboard
```

Then list Chrome DevTools MCP pages and select the page whose URL contains the returned `bind_selector` value, for example `cdp-open=6d4f8b0a9c1e2d33`. Use ordinary Chrome DevTools MCP navigation only when no real profile state matters. For profile-scoped tabs, do not use MCP `new_page` or `navigate_page` as the creation path; those tools target whichever profile/page the bridge already selected.

---

## Quick decision matrix

| Your situation | Recipe |
|---|---|
| Daily Chrome with live work, multi-profile, agent must read tabs | **Recipe 1 (Chrome DevTools MCP auto-connect)** |
| Fresh Chrome / CI / scripted, willing to relaunch | **Recipe 2 (Chrome DevTools MCP attach)** |
| Just want tab visible to yourself, no agent read | `chrome-profile <key> <url> --force` |
| Unsure | Run `chrome-profile doctor`, then try a live Chrome DevTools MCP page-list probe before blocking. |

---

## Cross-references

- `../SKILL.md` — top-level skill doc, "Bridge required" section
- `https://github.com/ChromeDevTools/chrome-devtools-mcp` — chrome-devtools-mcp upstream
