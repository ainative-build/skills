# Advisory Supervision (`--advice`)

Shared protocol for the opt-in `--advice` mode of workflow skills
(`aif-brainstorm`, `aif-plan`, `aif-cook`, `aif-fix`, `aif-code-review`,
`aif-ship`, and siblings that opt in). Each skill keeps its own
checkpoint list, then defers here for supervisor identity and model routing.

## What this is

`--advice` runs the skill under **`aif-kongming` advisory supervision**. Kongming
returns counsel only — never code, never file edits, never gate overrides. The
main agent stays responsible for every decision, edit, test, review, and
security policy.

## Supervisor identity

Always spawn the kit agent `aif-kongming` (portable frontmatter `model: fable`).
Do not substitute `aif-advisor` / `aif-advise` for these checkpoints — those are
interview-driven and interactive. Kongming is one-shot autonomous counsel.

Invoke shape (capability names vary by runtime):

```
delegate_agent capability(
  subagent_type="aif-kongming",
  prompt="<task, evidence, approaches tried, the exact question>",
  description="advice: <checkpoint>",
  /* model / effort: see Model routing below when the host requires them */
)
```

Give enough redacted context for one reply. No secrets, credentials, personal
data, or private environment values. Empty or error counsel is a non-fatal
advisory failure; authoritative skill gates still decide whether to proceed.

## Model routing (detect host, then pin)

Kongming must run on the **strongest advisory tier** for the host. Detect the
active coding-agent host from the session (runtime identity, provider, or
auth mode), then apply exactly one row:

| Detected host | Model for kongming | Effort / notes |
|---------------|--------------------|----------------|
| **Claude Code with subscription / OAuth** (Claude Max or equivalent; not API-key-only) | Claude **Fable 5** via kit tier `fable` (Claude Code keeps `model: fable` on the agent) | Prefer subscription sessions — Fable is subscription-backed. If Fable is unavailable on the account, hard-stop the advice spawn and say so; do not silently fall back to Sonnet/Opus and claim `--advice` ran on Fable. |
| **Codex** | **`gpt-6-astra`** | **`low`** reasoning effort. Prefer the emitted `.codex/agents/kongming.toml` override (`model` + `model_reasoning_effort`). When the host requires an explicit model/effort on the delegate call, pass those same values. |
| **Cursor** | Emitted agent model for `fable` → **`claude-fable-5-high`** | When `delegate_agent` requires an explicit `model` argument, pass that Cursor ID. Do not pass bare `fable`. |
| **Other / single-model hosts** (e.g. Pi inherit-only, Grok) | Strongest available session model | Tell the user in one sentence that `--advice` could not pin Fable/Astra and is same-model counsel. Still spawn `aif-kongming` for the protocol; do not invent unavailable IDs. |

### Detection rules (practical)

1. **Prefer emitted agent config.** If the installed `aif-kongming` agent already
   carries the correct host model (Claude `fable`, Codex `gpt-6-astra` + low,
   Cursor `claude-fable-5-high`), spawn by `subagent_type="aif-kongming"` and let
   the runtime load that definition.
2. **When the delegate API requires an explicit model**, pin using the table
   above — do not inherit a weaker parent session model for advice checkpoints.
3. **Subscription vs API on Claude Code:** treat OAuth / subscription Max
   sessions as the Fable path. Treat API-key-only Claude sessions as "Fable
   may be unavailable"; if spawn fails or the host rejects `fable`, hard-stop
   advice rather than pretending.
4. **Never** remap Codex advice to a Claude model ID, or Claude advice to a
   GPT ID, inside skill prose. Adapters own emit-time remaps; skills only pin
   when the live call needs an explicit argument.

## Forward-carry and PR gate

When handing off to a downstream workflow skill, pass `--advice` so supervision
persists. After required CI is terminal-green on a PR, spawn kongming once more
to review the whole implementation and post assessment plus concrete next steps
on the PR and source issue (when one exists) — unless another skill in the
chain already owns that checkpoint.

## Non-negotiables

- `--advice` never bypasses approval gates, tests, review blockers, branch
  protections, or security policy.
- Do not skip checkpoints because counsel was empty; record the miss and
  continue under the skill's authoritative gates.
- Do not claim Fable or `gpt-6-astra` low was used unless the spawn actually
  targeted that tier.
