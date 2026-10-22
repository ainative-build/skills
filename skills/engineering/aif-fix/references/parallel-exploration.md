# Parallel Exploration

Patterns for launching multiple subagents in parallel to scout codebase, verify implementation, and coordinate via the runtime's portable capabilities.

## Runtime Rules

- Use `delegate_agent` for subagents. Native names differ by runtime.
- Claude Code maps `delegate_agent` to Task.
- Codex Desktop maps `delegate_agent` to `multi_agent_v1.spawn_agent`; if the
  tool is deferred, first use `tool_search` for multi-agent spawn tools.
- Delegate when the runtime permits it: some runtimes only allow subagents when
  the user's own request asked for delegation or parallel agent work, so a skill
  instruction is not by itself authorization.
- If delegation is unavailable or not permitted, do the scout/verification in
  the main agent with `search_files`, `read_file`, and `run_shell`.

## Parallel Exploration (Scouting)

Launch multiple `aif-explore` subagents simultaneously when needing to find:
- Related files across different areas
- Similar implementations/patterns
- Dependencies and usage

**Portable pattern:**
- Delegate `aif-explore` with distinct prompts for area1, area2, and area3.
- Claude Code native form: `delegate_agent capability(subagent_type="aif-explore", prompt="...", description="...")`.
- Codex Desktop native form: `multi_agent_v1.spawn_agent(agent_type="aif-explore", message="...")`.

**Example - Multi-area scouting:**
Launch in one assistant turn when the runtime supports parallel calls:
- Explore auth-related files in `src/`
- Explore API routes handling users
- Explore tests for the auth module

## Parallel Verification (Bash)

Prefer direct `run_shell` verification in the main agent. Delegate verification
only when the user explicitly requested parallel delegation and the runtime has
a suitable worker role.

**Example - Multi-verification:**
Run typecheck, lint, build, and tests with `run_shell`; split across workers only
when delegation is permitted.

## Task-Coordinated Parallel (Moderate+)

For multi-phase fixes, discover the live task-management surface and use it to
coordinate parallel agents when available. Otherwise, track scopes and status
in the active plan.

**Pattern - Parallel issue trees:**
- Create separate plan items per independent issue.
- Mark each issue's debug item as blocking its fix item.
- Add a final integration-verify item blocked by all issue fixes.
- Spawn agents per issue tree through `delegate_agent` when permitted.

Agents claim work through the live surface when supported. Otherwise, the
orchestrator assigns non-overlapping scopes from the active plan and advances
blocked work only after prerequisites complete.

## When to Use Parallel

| Scenario | Parallel Strategy |
|----------|-------------------|
| Root cause unclear, multiple suspects | 2-3 `aif-explore` agents on different areas |
| Multi-module fix | Run `aif-explore` on each module in parallel when delegation is permitted |
| After implementation | `run_shell` for typecheck + lint + build; delegate only if permitted |
| Before commit | `run_shell` for test + build + lint; delegate only if permitted |
| 2+ independent issues | Plan tree per issue + delegated aif-fullstack-developer agents |

## Combining aif-explore + Tasks + Bash

**Step 1:** Parallel `aif-explore` to scout
**Step 2:** Sequential implementation (update Tasks as phases complete)
**Step 3:** Parallel Bash to verify

1. Scout payment handlers with `aif-explore`.
2. Scout order processors with `aif-explore`.
3. Wait for results, implement the fix, and update progress in the live surface or active plan.
4. Verify with `run_shell`: tests, typecheck, build.

## Resource Limits

- Max 3 parallel agents recommended (system resources)
- Each subagent has 200K token context limit
- Keep prompts concise to avoid context bloat
- Check the live surface for unblocked work when supported; otherwise read the active plan
