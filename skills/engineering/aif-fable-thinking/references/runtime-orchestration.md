# Runtime Orchestration — coordinating work across agent runtimes

Fable Thinking's moves, applied when a task spans more than one agent runtime — Claude
Code, Codex, Cursor, Gemini CLI, a hosted managed agent, a local model — or when
instructions must run unchanged on several. Each runtime is a distinct harness: its own
instruction file, tool names, permission model, reasoning space, context window, memory,
and home directory. The failure mode is uniformity: assuming what worked in one runtime
holds in the next, and assuming the next runtime knows what the previous one learned.
Nothing crosses a runtime boundary except files.

## When to load this reference

Load when more than one runtime or model vendor takes part in the work; when handing off
between sessions or runtimes, or resuming another runtime's work; when authoring skills,
harness files, hooks, or prompts that must run on several runtimes; when routing subtasks
by capability or cost; and whenever a runtime reports an unsupported primitive. Delegation
inside one runtime is `references/subagent-orchestration.md`.

## Know Your Own Defaults (cross-runtime failure modes)

- **Uniformity assumption** — tool names, permission prompts, private reasoning,
  sub-agent support, and context limits assumed identical everywhere.
- **Instruction-file drift** — two harness files (one per runtime) edited by hand until
  they disagree; each runtime reads only its own.
- **Memory illusion** — "as I found earlier" after a runtime switch. State travels only
  through artifacts.
- **Capability leakage** — one runtime's tool names or slash tokens inside portable
  instructions; they fail silently elsewhere. Capability lints exist for this reason.
- **Vendor prior** — model X's thinking controls, tool-choice behavior, or window assumed
  to match model Y's.
- **Cost blindness** — everything routed to the strongest runtime, or judgment routed to
  the cheapest.
- **Global mutation** — one runtime's setup writing into another runtime's home or config.
- **Handoff without receipt** — "continue from here" with no artifact naming the SHA, the
  state, and what was verified.

## How to think (the moves, in cross-runtime order)

1. **FRAME the division of labor.** Exactly one controller at a time. What does each
   runtime do best here — judgment, bulk edits, sandboxed long runs, browser-backed UI
   review? Name every boundary crossing up front; each one is a handoff that needs an
   artifact.
2. **GROUND the capability inventory per runtime — observed, not assumed.** Shell, file
   edit, fetch, search, sub-agents, private reasoning, hooks, MCP, permission mode, context
   window and compaction behavior, the instruction file it reads, how it names tools, how
   it signals its session (environment variables). Where the repository keeps a
   machine-readable runtime matrix, read it; otherwise probe with one cheap call per
   capability. A capability the matrix lists but the session denies is not available.
3. **Write portable instructions.** Capability wording ("run a shell command", "ask the
   user") instead of tool names; no runtime-specific slash tokens; graceful degradation
   ("if the runtime grants a browser, render; otherwise compute and downgrade the
   claim"); one canonical harness file per project with the others as symlinks or
   generated copies, never hand-maintained twins.
4. **Hand off through an artifact, never through memory** (template below): repo,
   branch, worktree, exact SHA; the goal as an end-state; done, in progress, open;
   decisions and why; a verification receipt (commands run and their results); files
   touched; environment facts; the next action. The receiving runtime starts by reading it
   and re-running the receipt — an OBSERVED in runtime A is PRIOR in runtime B until
   re-observed.
5. **Route by fit and cost.** Judgment, design, review, security to the strongest
   reasoning; scanning, formatting, bulk transforms to cheaper routes; long sandboxed
   loops to hosted or containerized runtimes; anything a cheap route produced gets more
   verification. Cost is per completed task (`references/token-economy.md`).
6. **Isolate mutation.** Each runtime owns its home and config; project files are shared
   and serialized — one writer per path at a time; parallel runtimes get separate
   worktrees; nothing mutates another runtime's global configuration; installs preview
   and snapshot before writing.
7. **Verify across the boundary.** After a handoff, re-run the receipt's commands in the
   new runtime; a differing result is a finding about the environment, not noise. When two
   runtimes did the same task, compare their outputs explicitly.
8. **Deliver:** which runtime did what, where the state artifact lives, what remains, and
   which claims were re-verified in the delivering runtime.

## What good runtime orchestration is (evaluable, not vibes)

- **Inventoried** — capabilities per runtime observed before the plan depends on them.
- **Portable** — instructions carry no tool names, slash tokens, or model names that only
  one runtime resolves.
- **Receipt-backed** — every handoff has an artifact a fresh session could resume from.
- **Serialized** — one writer per shared path; separate worktrees for parallel runtimes.
- **Fit-routed** — subtasks placed by capability and cost, with more verification on
  cheaper routes.
- **Re-verified** — receipts re-run after each crossing; differences recorded.

## What to avoid (the slop catalog — matches are failed gates)

- A slash command from one runtime pasted into another runtime's instructions.
- Instructions that assume private reasoning or sub-agents exist everywhere.
- Two harness files edited by hand and drifting.
- "As established earlier" after a runtime switch.
- A setup script that writes into another runtime's home directory.
- The same task run in two runtimes with results never compared.
- Model names hard-coded where the runtime substitutes its own.

## Details models habitually miss

- Permission modes differ: bypass, prompt, deny-by-default. A denial is a decision, not
  a bug to route around.
- Windows and compaction differ; a handoff artifact must stand alone.
- Shells and paths: zsh, bash, PowerShell; separators, quoting, line endings, case
  sensitivity.
- Session signals are per runtime; detect them, never guess.
- MCP servers, hooks, and skills are configured per runtime and per scope (user, project).
- Secret handling differs; restate redaction rules in every packet.
- Model controls — thinking parameters, tool-choice forcing, context limits — differ by
  vendor and version; version-sensitive means PRIOR until checked.
- Time zones and locales in CI versus the local runtime.
- Concurrent sessions on one repository share the stash stack, lockfiles, and generated
  artifacts.

## Verify (the loop)

1. Inventory: one cheap probe per capability the plan depends on, per runtime.
2. Portability lint: search the instructions for tool names, slash tokens, and model
   names inside code spans.
3. Handoff dry run: could a fresh session complete the task from the artifact alone? If
   not, the artifact is incomplete.
4. Re-run the receipt after each handoff; record differences.
5. Mutation audit: list every path written outside the project; each must belong to the
   runtime that wrote it.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Inventory | capabilities observed per runtime | probe log or matrix read |
| Portability | zero runtime-specific tokens in shared instructions | lint pass |
| Handoff | artifact complete; fresh-session dry run passes | receipt review |
| Isolation | one writer per path; no cross-home writes | mutation audit |
| Routing | each subtask placed with a stated fit and cost reason | routing note |
| Re-verification | receipt re-run after each crossing | recorded results |

## Handoff receipt template

```text
Repo / branch / worktree / SHA: ...
Goal (end-state): ...
Done: ... | In progress: ... | Open: ...
Decisions (and why): ...
Verification receipt: <command> -> <result>; ...
Files touched: ...
Environment: runtime, permission mode, package manager, ports, homes
Next action: ...
```

## Do / Don't

| Don't | Instead |
|-------|---------|
| Assume the next runtime has the same tools | Inventory capabilities; probe what the plan depends on |
| Write one runtime's tool names into shared instructions | Use capability wording; degrade gracefully |
| Maintain two harness files by hand | One canonical file; symlink or generate the rest |
| Continue from memory after a switch | Hand off through a receipt; re-run it on arrival |
| Route everything to the strongest runtime | Route by fit and cost; verify cheap routes more |
| Let a setup script touch another runtime's home | Each runtime mutates only what it owns |
| Treat a differing result as noise | Record it as a finding about the environment |
