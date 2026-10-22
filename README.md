# ainative-build / skills

Development-cycle skills, agents, rules and hooks for coding agents. One source tree runs on
Claude Code, Codex, oh-my-pi (OMP) and Cursor.

v2 is a hard fork of the AgentKit 3.0.0-beta.35 development-cycle skills, renamed to `aif-*`
and made self-contained: plans, journals and preferences use the scripts in this repo, and
nothing needs AgentKit or the `ak` CLI.

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
| Record | `aif-journal` | Keeps a chronological technical journal in `plans/journals/`. |
| Think | `aif-problem-solving` | Techniques for getting unstuck. |
| | `aif-deep-thinking` | A disciplined reasoning protocol for hard problems. |
| Media | `aif-ai-multimodal` | Analyzes and generates images, audio, video and documents. |

The usual path is `/aif-plan` → `/aif-serve` → `/aif-test` → `/aif-code-review` → `/aif-ship`.

## Agents, rules and hooks

- **15 agents** (`agents/aif-*.md`): chef, advisor, planner, researcher, recon, explore,
  debugger, tester, code-reviewer, code-simplifier, fullstack-developer, ui-ux-designer,
  docs-manager, git-manager and journal-writer. Per-runtime models are in
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
never touches AgentKit entries, and records what it owns in `~/.aif/install-manifest.json`.

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

Plans, reports, journals, language and per-hook switches live in an optional `.aif.json`. See
[docs/aif-config.md](docs/aif-config.md).

## Upgrading from v1

v2.0.0 is a breaking change. The v1 skills `aif-code-review`, `aif-recon` and `aif-improve` and
the v1 `code-reviewer` agent are replaced: `aif-code-review` is now the AgentKit-derived review
skill, `aif-recon` is now the AgentKit-derived recon skill, and `aif-improve` is gone. A
skills.sh install of v2 replaces `aif-code-review` and `aif-recon` but leaves the old
`aif-improve` in place; remove it with `npx skills remove -g aif-improve`. The v1 tree stays available
at the [`v1.3.1`](https://github.com/ainative-build/skills/tree/v1.3.1) tag.

## License

MIT © 2026 ainative-build. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for AgentKit
attribution and the Apache-2.0 and third-party components.
