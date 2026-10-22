## First-Time Setup

Install the local CLI shim from the shipped skill directory. Use the path that matches how the skill was installed:

```bash
# Claude Code native-skill layout
bash ~/.claude/skills/aif-chrome-profile/scripts/install.sh
bash .claude/skills/aif-chrome-profile/scripts/install.sh

# Current skill directory
bash scripts/install.sh

# Claude Code plugin layout
bash ~/.claude/plugins/<plugin>/skills/aif-chrome-profile/scripts/install.sh

# Codex native-skill layout, global or project-local
bash ~/.agents/skills/aif-chrome-profile/scripts/install.sh
bash .agents/skills/aif-chrome-profile/scripts/install.sh
```

If none of those paths exists, find the installed `aif-chrome-profile/scripts/install.sh` under the runtime skill directory and run that script. On Windows, run the sibling `install.cmd`.

Then run the guided checks:

```bash
chrome-profile doctor
chrome-profile setup
chrome-profile list
```

`setup` reads Chrome's `Local State`, proposes stable keys, and writes mappings to:

```text
$XDG_CONFIG_HOME/chrome-profile/profiles.json
```

That per-machine config survives skill and kit updates. Use `chrome-profile setup --yes` for non-interactive bootstrap.

## Browser Bridge Playbook

The CLI opens tabs in Chrome, but Chrome DevTools MCP must be able to read those tabs. `doctor` summarizes static setup. The live MCP probe above confirms whether the current agent runtime can actually reach the browser.

### Option A: Chrome DevTools MCP auto-connect

Use this when the runtime can expose Chrome DevTools MCP without a fixed remote-debugging endpoint. This avoids depending on a runtime-specific browser extension.

1. Configure Chrome DevTools MCP with auto-connect in the agent runtime's MCP config.
2. Restart the agent session so the MCP server loads.
3. Make a live page-list call. If Chrome prompts for remote-control approval, approve it and retry once.
4. Run:

```bash
chrome-profile doctor
```

Static `doctor` output may still be conservative. The live Chrome DevTools MCP page-list/read probe is the final reachability check.

### Option B: Chrome DevTools MCP attached to daily Chrome

Use this for pure CDP workflows, CI-like local setups, or when auto-connect is not desired. This usually requires relaunching Chrome.

1. Quit Chrome.
2. Relaunch Chrome with remote debugging:

```bash
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --remote-allow-origins=*
```

3. Add Chrome DevTools MCP to `.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--browserUrl", "http://127.0.0.1:9222"]
    }
  }
}
```

4. Restart the agent session, then run:

```bash
chrome-profile doctor
```

Expected result:

```text
bridge=chrome_devtools_mcp_attached
ok=true
```

If `doctor` reports `chrome_devtools_mcp_auto_connect` or `chrome_devtools_mcp_runtime_probe_required`, the static check found Chrome DevTools MCP config but cannot prove runtime reachability; run the live Chrome DevTools MCP probe. If it reports `cdp_endpoint_without_mcp_config`, Chrome is listening but the MCP config is missing or not loaded. If it reports `none`, run the live probe before deciding that no readable bridge is available.
