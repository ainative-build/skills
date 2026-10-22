# Internal Scouting with Explore Subagents

Use Explore subagents when SCALE >= 6 or external tools unavailable, and only
when the active runtime permits the `delegate_agent` capability.

## Delegation Gate

Do not spawn Explore only because this reference says to use Explore. Spawn
Explore only when:
- The user explicitly asked for subagents, delegation, or parallel agent work.
- The active runtime exposes a delegate_agent capability.
- Each subagent has a distinct scope and useful work to do.

If any condition is false, scout in the main agent with `search_files`,
`read_file`, and `run_shell`.

## How It Works

Spawn multiple `aif-explore` subagents through the runtime's `delegate_agent`
capability to search codebase segments in parallel.

## Runtime Tool Mapping

### Claude Code

Use the native delegate call:

```text
delegate_agent capability(subagent_type="aif-explore", prompt="<prompt>", description="<short scope>")
```

### Codex Desktop

Explore may be a deferred tool. If `multi_agent_v1` tools are not visible, first
call `tool_search` for multi-agent spawn tools. Then call:

```text
multi_agent_v1.spawn_agent(
  agent_type="aif-explore",
  message="<prompt>"
)
```

Do not set a model override. The Explore role owns its runtime model
configuration. Close completed agents after collecting results so they do not
consume concurrency slots.

## Prompt Template

```
Quickly scout {DIRECTORY} for files related to: {USER_PROMPT}

Instructions:
- Search for relevant files matching the task
- Use `search_files` capability for file discovery
- List files with brief descriptions
- Timeout: 3 minutes max
- Skip if timeout reached

Report format:
## Found Files
- `path/file.ext` - description

## Patterns
- Key patterns observed
```

## Spawning Strategy

### Directory Division
Split codebase logically:
- `src/` - Source code
- `lib/` - Libraries
- `tests/` - Test files
- `config/` - Configuration
- `api/` - API routes

### Parallel Execution
- Spawn all agents in a single assistant turn when the runtime supports parallel tool calls
- Each agent gets distinct directory scope
- No overlap between agents

## Example

User prompt: "Find authentication-related files"

```
Agent 1: Scout src/auth/, src/middleware/ for auth files
Agent 2: Scout src/api/, src/routes/ for auth endpoints
Agent 3: Scout tests/ for auth tests
Agent 4: Scout lib/, utils/ for auth utilities
Agent 5: Scout config/ for auth configuration
Agent 6: Scout types/, interfaces/ for auth types
```

## Timeout Handling

- Set 3-minute timeout per agent
- Skip non-responding agents
- Don't restart timed-out agents
- Aggregate available results

## Reading File Content

When reading file content, chunk it rather than loading whole large files, so the scout stays well inside the context window.

### Step 1: Get Line Counts
```bash
wc -l path/to/file1.ts path/to/file2.ts path/to/file3.ts
```

### Step 2: Calculate Chunks
- **Target:** ~500 lines per chunk (safe for most files)
- **Max files per agent:** 3-5 small files OR 1 large file chunked

**Chunking formula:**
```
chunks = ceil(total_lines / 500)
lines_per_chunk = ceil(total_lines / chunks)
```

### Step 3: Read Chunks

**Small files (<500 lines each):**
Use `read_file` directly or `run_shell` with `sed`/`cat` for test-controlled
paths.

**Large file (>500 lines) - use sed for ranges:**
Use `run_shell` with `sed -n` ranges in the main agent. Delegate chunk reading
only when the user explicitly requested parallel delegation and the runtime has
an appropriate worker role.

### Chunking Decision Tree
```
File < 500 lines     → Read entire file
File 500-1500 lines  → Split into 2-3 chunks
File > 1500 lines    → Split into ceil(lines/500) chunks
```

Spawn all in a single assistant turn only when delegation is permitted.

## Result Aggregation

Combine results from all agents:
1. Deduplicate file paths
2. Merge descriptions
3. Note any gaps/timeouts
4. List unresolved questions
