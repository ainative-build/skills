# UI Fix Workflow

For fixing visual and interaction issues.

## Progress Tracking

The stages are `analyze → implement → verify visually → inspect runtime → test
→ document`. Discover the live task-management surface and mirror this chain
when available. Otherwise, update the active plan. Plan files are the durable
source of truth.

## Workflow

### Step 1: Analyze

Analyze screenshots or videos with `aif-ai-multimodal`. Read the project's
routed design guidance when present and identify the exact discrepancy.

### Step 2: Implement

Use the `aif-ui-ux-designer` agent and follow existing component patterns.

### Step 3: Verify Visually

Capture the affected container, compare it with the accepted design, and use
`aif-ai-multimodal` when useful. If incorrect, return to Step 2.

Under `--advice`, a failed check is an objective `aif-oracle` trigger: STOP and spawn `aif-oracle` with the command, its output, and what you tried before re-diagnosing; never self-reason past a red check.

### Step 4: Inspect Runtime Behavior

Use `aif-agent-browser`, Chrome MCP / `chrome-devtools-mcp`, or project-native
browser tests. Check interaction, console, and network behavior.

### Step 5: Test

Use the aif-tester agent for compilation and the affected UI test surface.

### Step 6: Document

Update routed design guidance only when the accepted design contract changed.

## Tips

- Use `aif-ai-multimodal` for generating visual assets
- Use ImageMagick for deterministic image transformations
