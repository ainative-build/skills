# ainative-build / skills

Development-cycle skills, agents, rules and hooks for coding agents. One source tree runs on
Claude Code, Codex, oh-my-pi (OMP) and Cursor.

Everything is self-contained: plans and preferences use the scripts in this repo, with no other
CLI or service to install. aif keeps its plans and reports in a `.aif/` folder at the project root.

## Skills by stage

| Stage | Skill | What it does |
|---|---|---|
| Shape | `aif-advise` | Interviews until the outcome is clear, then gives evidence-backed advice. |
| | `aif-brainstorm` | Turns unclear intent into an accepted outcome and compares approaches. |
| | `aif-research` | Researches technologies, architectures and requirements. |
| Plan | `aif-plan` | Writes phased plans with acceptance criteria; validate, red-team and archive modes. |
| Build | `aif-serve` | Implements a plan or feature end to end with verification and review. |
| | `aif-recon` | Maps the files, callers and tests a task touches. |
| Fix | `aif-debug` | Proves the root cause of a failure before any fix. |
| | `aif-fix` | Fixes bugs, test, type, lint and CI failures with routed workflows. |
| Verify | `aif-test` | Runs and designs test suites; create, audit and optimize modes. |
| | `aif-web-testing` | Playwright, Vitest and k6 patterns for web apps. |
| | `aif-agent-browser` | Drives a tool-managed browser for snapshots, forms and UI checks. |
| | `aif-chrome-profile` | Drives your real Chrome profile through Chrome DevTools MCP. |
| Review | `aif-code-review` | Reviews changes, a PR, a commit or the codebase with evidence. |
| Ship | `aif-git` | Conventional commits, branches, PRs and merges with secret scanning. |
| | `aif-ship` | Takes a finished branch through tests, review, PR, merge and release. |
| Think | `aif-problem-solving` | Techniques for getting unstuck. |
| | `aif-deep-thinking` | A disciplined reasoning protocol for hard problems. |
| Media | `aif-ai-multimodal` | Analyzes and generates images, audio, video and documents. |

The usual path is `/aif-plan` → `/aif-serve` → `/aif-test` → `/aif-code-review` → `/aif-ship`.

Work is test-first by default. Every plan phase has a Tests First section, and `/aif-serve` uses
`aif-test` to write those tests and confirm they fail for the right reason before it implements
anything, then makes them pass. Pass `--no-test` to `/aif-serve` to skip this; it reports the
gap.

## Pro-max mode (`--pro-max`)

`--pro-max` trades cost for quality on work with a checkable outcome. Instead of one pass, the
skill builds one evidence packet and a scoring rubric, sends the same packet to five independent
read-only candidates in parallel, and has `aif-chef` on the strongest model score them.

- **Winner selection:** `aif-brainstorm`, `aif-plan`, `aif-advise`, `aif-research`,
  `aif-debug`, `aif-fix`, `aif-problem-solving` and `aif-test` keep the single best candidate
  unchanged. They never blend candidates, because a blend is not what the verifier checked.
- **Union:** `aif-code-review` and `aif-recon` keep the evidence-checked, deduplicated union of
  the five candidates' findings, so a catch made by only one candidate is not lost.
- **Fails closed:** it needs parallel subagents. On a runtime without them it stops and says so
  instead of running five passes in a row. If fewer than five candidates are usable after one
  retry, or the verifier rejects them all, nothing is written.
- **Receipt:** each run appends a one-line `pro-max:` receipt to its report or plan with the pick
  and its margin, so you can tell whether the extra cost paid off.

Use it where checking an answer is easier than producing one, such as a plan against acceptance
criteria or a review against evidence. For open-ended taste work it adds cost without a reliable
signal.

```
/aif:plan add rate limiting to the public API --pro-max
```

## Chef mode (`--chef`)

`--chef` runs a workflow under supervision by `aif-chef`, an agent that gives one-shot counsel
from the strongest model available. Chef only advises: it never writes code, edits files or
overrides a gate, and the main agent stays responsible for every decision.

- **Checkpoints:** the skill consults chef after each phase or decision round, when it is stuck
  after repeated failures, and before a high-stakes or irreversible step such as a public-contract
  change.
- **Carries forward:** `--chef` is passed to the next skill in the chain. Once a PR's required
  checks are green, chef reviews the whole change and posts its assessment and next steps on the PR.
- **Plans for smaller models:** `/aif:plan --chef` writes a handover plan that a lower-capability
  executor can follow, with step-by-step tasks, mechanical pass conditions and a failure protocol
  that stops and asks chef when a check fails.
- **Supported by** `aif-brainstorm`, `aif-plan`, `aif-serve`, `aif-fix`, `aif-test`,
  `aif-code-review` and `aif-ship`.

Chef runs on Fable on Claude Code, on `claude-fable-5-high` on Cursor and on the `@advisor` model
role on OMP. On Codex it is pinned to `gpt-6-astra`; when an account refuses that model, it falls
back through the sol, terra and luna models in order and tells you which one answered. You can
also call chef on its own, for example `@aif-chef` on Claude Code, for a second opinion on a hard
call.

```
/aif:serve .aif/plans/261022-1320-rate-limit --chef
```

## Agents, rules and hooks

- **14 agents** (`agents/aif-*.md`): chef, advisor, planner, researcher, recon, explore,
  debugger, tester, code-reviewer, code-simplifier, fullstack-developer, ui-ux-designer,
  docs-manager and git-manager. Per-runtime models are in
  `agents/runtime-models.json`.
- **9 rules** (`rules/*.md`): development rules, workflow and skill routing, orchestration,
  documentation, review decisions, process management and the hook response protocol.
- **6 hooks** (`hooks/`): session and subagent context, a development-rules reminder, a privacy
  guard for secrets files, a scout guard against broad scans, and a secret-output reminder.

## Install

Skills install through skills.sh or the Claude Code plugin. Agents, rules and hooks come with the
plugin on Claude Code, and from `aif-install` everywhere else.

### Skills only (any runtime)

```bash
npx skills@latest add ainative-build/skills
```

### Claude Code plugin (skills, agents and hooks)

```
/plugin marketplace add ainative-build/skills
/plugin install aif@ainative-build
```

Commands are namespaced: `/aif:plan`, `/aif:serve`, `/aif:code-review`, and so on.

### Agents, rules and hooks without the plugin

```bash
npx -p github:ainative-build/skills aif-install --runtime codex
```

`--runtime` takes `claude`, `codex`, `omp`, `cursor` or `all`. Add `--dry-run` to list the files
first and `--uninstall` to remove everything it added. The installer backs up each file it edits,
never touches entries it did not write, and records what it owns in `~/.aif/install-manifest.json`.

On Claude Code, use either the plugin or `aif-install --runtime claude`, not both; both register
the same hooks.

## Runtime support

| | Claude Code | Codex | OMP | Cursor |
|---|---|---|---|---|
| Skills | yes | yes | yes | yes |
| Agents | yes | yes (TOML) | yes (model roles) | yes |
| Rules | yes | inlined in `AGENTS.md` | yes | `.mdc` |
| Context hooks | yes | yes | no hooks | session start only |
| Privacy and scout guards | yes | yes | no hooks | yes, via `cursor-adapter.cjs` |

Cursor cannot add context on prompt submit or subagent start, so it gets the rules through `.mdc`
files instead of the reminder hook. Codex runs new hooks only after you approve them, so start
`codex` once after installing and approve the aif hooks.

## Configuration

Plans, reports, language and per-hook switches live in an optional `.aif/config.json`. See
[docs/aif-config.md](docs/aif-config.md).

## Upgrading from v1

v2.0.0 is a breaking change. The v1 skills `aif-code-review`, `aif-recon` and `aif-improve` and
the v1 `code-reviewer` agent are replaced: `aif-code-review` and `aif-recon` are new skills under
the same names, and `aif-improve` is gone. A
skills.sh install of v2 installs `aif-code-review` and `aif-recon` under the same names but
leaves the old `aif-improve` in place; remove it with `npx skills remove -g aif-improve`. The v1 tree stays available
at the [`v1.3.1`](https://github.com/ainative-build/skills/tree/v1.3.1) tag.

## License

MIT © 2026 ainative-build; see [LICENSE](./LICENSE). These parts keep their own licenses:

- `skills/engineering/aif-agent-browser/` and `skills/engineering/aif-web-testing/` are licensed
  under Apache-2.0; the full text is in each directory's `LICENSE`. They were modified for this
  repo: renamed to `aif-*`, with references to removed skills and runtime metadata deleted.
- `skills/engineering/aif-chrome-profile/` is MIT, Copyright (c) 2026 chrome-profile-cdp
  contributors; see that directory's `LICENSE`.
- `hooks/scout-block/third-party/ignore.cjs` is
  [ignore](https://github.com/kaelzhang/node-ignore) v5.3.0, MIT, Copyright (c) 2013 Kael Zhang.
