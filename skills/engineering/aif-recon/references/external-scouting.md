# External Scouting with OpenCode

Use external agentic tools only when the user permits that execution path and
the runtime-native search capabilities are insufficient.

## Routing

```text
Native/local search sufficient  -> use search_files, read_file, rg, wc, sed
External probe permitted        -> use OpenCode for bounded read-only scopes
```

## OpenCode CLI

```bash
opencode run "Find all payment-related files in lib/ and api/" --model opencode/grok-code
```

## Installation Check

Verify OpenCode before using the external path:

```bash
command -v opencode
```

If OpenCode is not installed, continue with `search_files`, `read_file`, and
scoped `run_shell` searches. Use internal Explore delegation only when the user
explicitly requested or permitted subagents.

## Parallel External Commands

Prefer parallel runtime tool calls when available. If only shell execution is
available, run independent one-shot searches with non-overlapping scopes:

```bash
opencode run "Read-only: search db/ and migrations/ for migration files" --model opencode/grok-code
opencode run "Read-only: search lib/ and src/ for database schema files" --model opencode/grok-code
opencode run "Read-only: search config/ for database configuration" --model opencode/grok-code
```

Do not dispatch multiple searches against the same directories. External tools
must remain read-only for scouting prompts.

## Prompt Guidelines

- Name exact directories to search.
- Request file paths with one-line relevance notes.
- State that the task is read-only.
- Set scope boundaries and exclusions.
- Ask for relationships only when they affect the task.

## Reading File Content

Use local chunking for large files. Do not send whole private files to an
external CLI just to bypass a context limit.

### Step 1: Get Line Counts

```bash
wc -l path/to/file1.ts path/to/file2.ts path/to/file3.ts
```

### Step 2: Read Bounded Chunks

- Files under 500 lines: read directly.
- Files from 500 to 1500 lines: split into 2-3 chunks.
- Files over 1500 lines: split into roughly 500-line chunks.

```bash
sed -n '1,500p' large-file.ts
sed -n '501,1000p' large-file.ts
```

## Error Handling

- Treat a non-zero exit code as failure.
- Do not retry a failed external probe automatically.
- After two external failures, continue with native/local scouting.
- Note incomplete directory coverage in the report.
