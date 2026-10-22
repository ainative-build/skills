# UI Testing Workflow

Use `aif-agent-browser` for live browser interaction when a fresh/tool-managed browser is enough. Use `aif-chrome-profile` only when the test needs the user's real Chrome profile, cookies, or already-logged-in state. Use `aif-web-testing` or project-native Playwright/Vitest/k6 commands for repeatable test runs.

## Purpose
Verify the requested UI contracts with bounded browser work and report the
observed scope. A focused change does not imply a whole-application audit.

## Arguments
- $1: URL - The URL of the website to test
- $2: OPTIONS - Optional test configuration (e.g., --headless, --mobile, --auth)

## Testing Protected Routes (Authentication)

### Step 1: Resolve test authentication
Prefer approved project test accounts and auth fixtures in an isolated environment.
Ask for manual login only when needed; do not request cookie/token exports or use
real customer data. Existing real-profile access must be necessary and authorized.

### Step 2: Persist Auth State Or Select The Chrome Profile
Prefer project-native auth helpers for repeatable tests. For ad-hoc browser driving with real user auth/cookies, invoke `aif-chrome-profile` and run:

```bash
chrome-profile doctor
chrome-profile setup
chrome-profile list
```

If real user Chrome state is not needed, use `agent-browser` state commands after manual login when available.

### Step 3: Run Tests
Load the `aif-agent-browser` skill before driving the `agent-browser` CLI; it carries the command
reference. After auth is available, run tests normally. If real user Chrome state is not needed:
```bash
agent-browser open https://example.com/dashboard
mkdir -p "$REPORTS_DIR" && agent-browser screenshot "$REPORTS_DIR/profile.png"   # REPORTS_DIR: the configured reports directory; the path is positional, there is no -o flag
```

If real user Chrome state is needed:

```bash
chrome-profile open --json work https://example.com/dashboard
```

Then select the MCP page whose URL contains the returned `bind_selector` such as `cdp-open=<token>`, verify it also contains `cdp-profile=work`, and capture screenshots or snapshots through the active bridge.

This restriction applies only when real user Chrome state is required. For profile-scoped testing, do not use raw Chrome MCP `new_page` or `navigate_page` as the opening path. Those tools use whichever profile/page the bridge currently targets.

## Workflow

1. State a narrow charter: accepted expectation, target journey/control, affected
   routes, account/data boundary and mandatory checks. Separate a goal that may
   use different paths from a claim that a specific button/path works.
2. Inspect only relevant pages and dependencies; broaden for discovered risk or
   policy. Use existing project browser tests first. No `e2e`, model, key or consent
   is required for this native route. Load `agentic-e2e-workflow.md` only when the
   project already uses that engine or the user requests its setup.
3. Set time/step/retry/model-call budgets appropriate to the charter. Run sequentially;
   delegate only independent targets with isolated resources and justified capacity.
4. Assert exact identities, permissions, counts and side effects deterministically.
   Use screenshots/vision only for claims requiring visual evidence, not every page.
5. Investigate findings: establish expected versus observed behavior, then reproduce
   a failure for the intended reason. Classify confirmed defect, semantic hypothesis,
   environment/tooling blocker or unknown; setup failures are not product defects.
6. Save each run's artifacts separately, check source/environment freshness, and
   report using `report-format.md`. Verify cleanup of owned browser/service/test data.

Exploration stopping without findings proves only what was observed within that
charter and budget. It cannot replace mandatory assertions. For a confirmed bug,
propose a durable regression test using `test-lifecycle.md`. An unfixed bug outside
this task remains visible and follows existing release policy, not silent quarantine.

## Output Requirements
- Clear, structured Markdown with headers, lists, code blocks
- Include test results summary, key findings, screenshot references
- Lead with the outcome. Keep reports short by being selective, not by compressing the writing into fragments or arrow chains; write complete sentences.

**Do not** start implementing fixes.
