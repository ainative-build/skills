# agent-browser and Browser MCP

Guidance for choosing between `agent-browser` and MCP-based browser diagnostics.

## Use Case Decision Tree

```
Need browser automation?
|
+-- Needs the user's real Chrome profile, cookies, tenant, or Google account?
|   +-- YES --> aif-chrome-profile
|   +-- NO --> Continue
|
+-- Long autonomous AI session?
|   +-- YES --> agent-browser (better context efficiency)
|   +-- NO --> Continue
|
+-- Need video recording?
|   +-- YES --> agent-browser (built-in)
|   +-- NO --> Continue
|
+-- Cloud browser (CI/CD)?
|   +-- YES --> agent-browser (Browserbase native)
|   +-- NO --> Continue
|
+-- Low-level Chrome DevTools Protocol inspection?
|   +-- YES --> configured chrome-devtools-mcp bridge/client
|   +-- NO --> Continue
|
+-- Ad-hoc page driving, snapshots, screenshots, forms?
|   +-- YES --> agent-browser
+-- Otherwise --> aif-web-testing for test strategy/runners
```

## Primary Patterns

```bash
# Long autonomous session
agent-browser --session test1 open https://example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser close
```

## MCP Pattern

Use the configured `chrome-devtools-mcp` bridge or MCP client when the task specifically needs MCP/CDP tools. Availability is environment-specific; do not assume a slash command wrapper is installed.

## Chrome Profile Pattern

```bash
chrome-profile doctor
chrome-profile setup
chrome-profile open --json work "https://example.com/dashboard"
```

Then select the page whose URL contains the returned `bind_selector` such as `cdp-open=<token>` through the active MCP bridge, and verify it also contains `cdp-profile=work`.

This restriction applies only after the decision tree says real profile state is required. For generic/profile-independent Chrome diagnostics, Chrome DevTools MCP can use its normal navigation tools. For profile-scoped work, do not use raw Chrome DevTools MCP `new_page` or `navigate_page` as the opening path. Those tools target whichever profile/page the bridge currently selected.

## Migration Notes

| Old local script habit | Current route |
|------------------------|---------------|
| `node navigate.js --url X` | `agent-browser open X` |
| `node aria-snapshot.js --url X` | `agent-browser open X && agent-browser snapshot -i` |
| `node select-ref.js --ref e5 --action click` | `agent-browser click @e5` |
| `node fill.js --selector "#email" --value "X"` | `agent-browser fill @e1 "X"` |
| `node screenshot.js --output X.png` | `agent-browser screenshot ./X.png` |
| `node console.js --types error` | Configured MCP browser console tools, or a project-local Playwright test |
| `node network.js` | Configured MCP network tools, or a project-local Playwright test |
