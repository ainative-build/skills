# Optional advisory modes

### 6. Emit outputs per flags

Write the canonical advice report first (needed as subagent input), using the naming pattern from the `## Naming` section in the injected context with type `advise`. Then spawn flag subagents — subagents that don't depend on each other run in parallel. Each subagent prompt must include: the task, the report path to read, files it may write, acceptance criteria, and "DO NOT COMMIT OR PUSH".

**`--md`** — spawn `aif-docs-manager`:
- Produce a polished standalone markdown report from the advice content (audience: someone who did not see the conversation). Skip if the canonical report already meets this bar; then `--md` just reports its path.

**`--github`** — spawn `aif-git-manager`:
- If the input was a GitHub issue/PR: post the advice as a comment on it (`gh issue comment <number> --body-file <body.md>`), leading with Needs from you (when present), then the reframed problem and verdict.
- Otherwise: create a new issue in the current repo (`gh issue create --title "<reframed title>" --body-file <body.md>`) containing the reframing, requirements, goals, done means, advice summary, and the handoff brief verbatim.
- If `gh` fails (auth, permissions), report the exact error; do not fake success.

Report every artifact path and URL in the final response.

## Running via the aif-advisor subagent (`--agent`)

When `--agent` is passed, act as the orchestrator for the `aif-advisor` subagent
instead of running steps 1-5 here: the subagent runs the same workflow on the
`fable` model in its own context, which keeps the long interview out of the
caller's context. This mode is Claude Code only; on other runtimes fall back to
running the skill inline.

<!-- capability-lint-allow: --agent relay is Claude Code-only; naming the native AskUserQuestion tool is intentional here -->
A Claude Code subagent cannot call `AskUserQuestion`, so the advisor relays each
question back to you and is re-spawned with the answer. Loop:

1. Pick a state file path under the reports directory (naming from the injected
   `## Naming` section, type `advise`, suffix `-state.md`) and a report path
   (same base, `.md`). The state file need not exist yet.
2. Spawn `aif-advisor` via the `Agent` tool with: the original input and flags, the
   state file path, the report path, and — on re-spawns only — the latest user
   answer as `ANSWER to Q<n>: <text>`.
3. Read the advisor's returned final message:
   - Starts with `NEEDS_USER_INPUT`: parse the fenced `json` block that follows and <!-- capability-lint-allow: --agent relay is Claude Code-only; naming the native AskUserQuestion tool is intentional here -->
     pass it VERBATIM as the single question to `AskUserQuestion`. Then go to
     step 2 and re-spawn the advisor with the user's answer. Do not reword the
     question or invent options.
   - Starts with `NEEDS_PREVIEW`: parse the fenced `json` block that follows. It
     holds `reframing` (the full draft the user is confirming), `brief` (what to draw, taken from the reframing, with assumptions
     marked), `kind` (`diagram` or `explain`), `preview_path`, and `question`.
     Render the preview yourself: an inline Mermaid diagram for `diagram`, or a
     text mockup (sample output, a sketched screen, or a before/after table) for
     `explain`. When `preview_path` is set, also save it there as Markdown.
     Show the user `reframing` verbatim and the preview, then
     pass `question` VERBATIM as the single question to the `ask_user`
     capability. Re-spawn the advisor with
     `ANSWER to Q<n>: <text> (preview: <actual path or "inline">)`.
   - Starts with `ADVICE_READY: <path>`: read that report, present the advice to
     the user, then run step 6 (Emit outputs per flags) against it. Done.
   - Starts with `ADVISE_SKILL_NOT_FOUND` or any other error: surface it and stop;
     do not fake advice.
4. There is no fixed round cap: every round waits on a real answer from the
   user, so the user controls how long the interview runs. When the user ends the
   interview, re-spawn the advisor with `ANSWER to Q<n>: user ended the
   interview`; it moves to the reframing with open gaps marked as assumptions,
   as the inline flow does. Stop when the advisor returns `ADVICE_READY`, when
   the user aborts the session (then report the state file path so it can
   resume), or on an error. If a `NEEDS_USER_INPUT` question repeats one the
   state file already answers, re-spawn once with a note naming the earlier
   answer; if it repeats again, stop and report the state file path.
   `NEEDS_PREVIEW` rounds are never treated as repeats, because each one follows
   a user correction.

The advisor never spawns the flag subagents (`--md` / `--github`); you own step 6 after `ADVICE_READY`, using the advisor's report as
input.

## Ultra Verifier Mode (`--ultra`)

When `--ultra` is present, produce the advice as a best-of-5 verifier pass
instead of a single draft. Crucially, **the interview and reframing run once**
and **only the advice generation is fanned** — the user is never grilled five
times.

1. Run steps 1-4 (analyze, scout, interview one question at a time, preview and
   confirm the reframing) exactly as normal, once.
2. Build the immutable evidence packet: the **original input + scout
   findings/refs + the confirmed reframing** (problem, requirements, goals,
   done means, non-goals, constraints, with preview feedback already folded in),
   plus the confirmed preview path when one exists and `--yagni` when set.
   This packet is passed identically into all five candidate prompts.
3. Dispatch **exactly five independent read-only candidates** in one parallel
   wave, each generating the full step-5 advice from the shared packet.
   Candidates are read-only and do not call `ask_user` or re-interview, because
   the interview already happened and its answers are in the packet.
4. A single strongest-model verifier scores each candidate 1-20 per rubric
   criterion, ranks them, and **selects the winning advice** (or rejects all).
5. The controller emits the winning advice unchanged via step 6 (flag outputs)
   with a short ranking appendix. On reject-all, hard-stop and report why.

- **Candidate task:** the complete step-5 advice — needs from you (when any),
  verdict, do/don't, better alternatives, recommended path, benefits,
  trade-offs, unverified claims, and the work checklist + success metrics +
  handoff brief — grounded in the confirmed reframing.
- **Rubric:** faithfulness to the confirmed requirements/non-goals, evidence
  grounding (scout/URL over assertion), honesty of trade-offs (names real costs,
  no praise-padding), and actionability of the checklist, success metrics, and
  handoff brief (observable Done-means end states, narrow stop conditions).

`--ultra` **hard-conflicts with `--agent`**: both own how the advice is
produced. Passing both is a hard-stop naming both flags, never a silent
resolution. `--ultra` composes with `--md`, `--github`, and `--yagni`. Full mechanics — anonymization, the five-usable-candidate gate with
one bounded re-dispatch, the fail-closed runtime rule, and reject-all — are in
`../../aif-brainstorm/references/ultra-verifier-mode.md`. It is a best-of-5 verifier
mode inspired by LLM-as-a-Verifier, not the full framework; never claim its
logprob/tournament algorithm.
