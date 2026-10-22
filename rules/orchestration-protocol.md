# Orchestration Protocol

Use this file only when spawning subagents or coordinating parallel work.

## Delegation Context

Every subagent prompt should include:

- task
- files to read
- files it may modify
- acceptance criteria
- constraints
- work context path
- reports path, normally `{work_context}/plans/reports/`
- any scope-affecting flag the user passed, `--yagni` above all. A delegate that
  never sees the flag silently reverts to the default of delivering the full
  requested scope.

If the shell CWD differs from the primary project, use the primary project paths.

## Context Isolation

- Do not pass full conversation history.
- Summarize only decisions needed for the subtask.
- Give exact file paths instead of "look around the repo" unless scouting is the task.
- Keep coordination, merge decisions, and user approvals in the controller session.

## Parallel Work

Use parallel subagents only when file ownership is clear and integration points are known. Avoid parallel edits to the same file, generated artifact, database migration sequence, or shared config.

## Status Protocol

Ask subagents to end with:

```text
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: one or two sentences
Concerns/Blockers: optional
```

Handle `BLOCKED` and `NEEDS_CONTEXT` by changing context, scope, or approach. Do not retry the same failing prompt repeatedly.

## Model Escalation

When the current session or a subagent runs on a model below `fable` (e.g. `opus`, `sonnet`, `haiku`) and hits a hard problem — repeated failed attempts, a high-stakes design fork, or fuzzy requirements — spawn the `aif-chef` agent for counsel instead of switching the session model. `aif-chef` runs autonomously on the strongest available model and returns full advice in one reply (no interview, no user round-trips). Give it the task, evidence gathered so far, approaches tried, and the specific question. It advises only; the caller stays responsible for the implementation. On Codex, `aif-chef` is pinned to `gpt-6-astra`; if the account refuses it, use the Codex model fallback below. For interview-driven advisory with user participation, use the `aif-advisor` agent or `/aif-advise` instead.

## Codex Model Fallback

Each `aif-*` agent on Codex is pinned to a model in its `.codex/agents/aif-<name>.toml`. Some accounts refuse stronger models (Codex signed in with a ChatGPT account returns "model is not supported"). When a spawn is refused for the model itself, keep the task on the same agent and fall back to the next model below the pinned one in this order, until one answers: `gpt-6-astra`, `gpt-6-sol`, `gpt-5.6-sol`, `gpt-6-terra`, `gpt-5.6-terra`, `gpt-6-luna`, `gpt-5.6-luna`.

- Try every listed model even after another model of the same class was refused, because accounts support models one by one.
- Codex ignores a `model` override when `agent_type` is set, so spawn each fallback with no `agent_type`, with `model` set to that model and the pinned `reasoning_effort` (`max` when falling back from `gpt-6-astra`), and start the message by telling the agent to act as `aif-<name>` by reading and following the `developer_instructions` in `$CODEX_HOME/agents/aif-<name>.toml` (default `~/.codex/agents/aif-<name>.toml`).
- Fall back only on a model refusal. A timeout, empty reply or tool error is a normal agent failure, not a reason to change models.
- Tell the user which model answered and that the pinned model was refused.
