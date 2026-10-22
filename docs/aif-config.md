# aif configuration

aif skills, scripts and hooks read one optional JSON file. Every key has a default, so no file is
required.

## Where it lives

Values merge in this order, later winning:

1. Built-in defaults.
2. `~/.aif.json` (user).
3. `<project>/.aif.json`, where `<project>` is the git top level, or the current directory outside git.

A file that fails to parse, or a key with the wrong type, is skipped and the remaining values still
resolve. `prefs.cjs validate` reports the problem and exits 3.

## Keys

| Key | Type | Default | Used for |
|---|---|---|---|
| `plans.dir` | string | `plans` | Where plan directories live, relative to the project root |
| `plans.naming` | string | `{date}-{slug}` | Plan directory name; `{date}` and `{slug}` are substituted |
| `plans.dateFormat` | string | `YYMMDD-HHmm` | Format of `{date}`; tokens `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm` |
| `reports.dir` | string | `plans/reports` | Where skills write reports |
| `journal.auto` | boolean | `true` | Whether skills write a journal entry automatically when they finish |
| `journal.dir` | string | `plans/journals` | Where journal entries are written |
| `language` | string | unset | Preferred response language |
| `hooks.<name>` | boolean | `true` | Set `false` to turn one hook off. `<name>` is `session-init`, `subagent-init`, `dev-rules-reminder`, `privacy-block`, `scout-block` or `secret-output-guardrail` |

Example:

```json
{
  "plans": { "dir": "docs/plans" },
  "journal": { "auto": false }
}
```

## Reading and changing values

`prefs.cjs` ships in the `aif-plan` skill at `aif-plan/scripts/prefs.cjs`.

```bash
node aif-plan/scripts/prefs.cjs resolve --json      # all merged values and which files supplied them
node aif-plan/scripts/prefs.cjs get journal.auto    # prints true or false
node aif-plan/scripts/prefs.cjs set journal.auto false          # writes <project>/.aif.json
node aif-plan/scripts/prefs.cjs set plans.dir docs/plans --user # writes ~/.aif.json
node aif-plan/scripts/prefs.cjs unset journal.auto
node aif-plan/scripts/prefs.cjs validate            # exit 3 when a file is invalid
```

`set` accepts only the keys in the table above.

## Local plan state

Plan files are canonical: `plan.md` and `phase-NN-*.md` carry titles, status and checkboxes.
Information that is per machine rather than part of the plan lives in `~/.aif/plans-state.json`,
outside the repository:

- lifecycle state (`active`, `closed`, `archived`), set by `plan.cjs close`, `archive` and `cleanup`;
- the current-plan pointer for each worktree, set by `plan.cjs use`;
- GitHub provenance: linked PR, issue, root comment id and per-phase comment ids, set by
  `plan.cjs update` and `plan.cjs phase update`.

Deleting this file loses only that local information; every plan file stays intact.

## Hook files

The hooks keep their own state under `~/.aif/`: one-time privacy approvals in
`~/.aif/state/privacy-grants/`, trusted project allowlists in `~/.aif/state/aifignore-trust/`, the
last development-rules reminder per session in `~/.aif/state/reminders/`, and a JSON Lines log in
`~/.aif/logs/hook-log.jsonl`.

Two ignore files tune the guard hooks, both in `.gitignore` syntax:

- `.aifignore` lists paths the privacy guard may skip. `~/.aif/.aifignore` applies directly.
  `<project>/.aifignore` arrives with the repository, so the hook asks once before trusting its
  current content.
- `.scoutignore` at the git root lists more paths for the scout guard to block, on top of the
  built-in list (`node_modules`, `dist`, `build`, `.git`, virtualenvs and similar); a `!pattern`
  line re-allows a path.

Environment variables, all optional:

| Variable | Default | Effect |
|---|---|---|
| `AIF_HOME` | `~/.aif` | Where hook state and logs live |
| `AIF_HOOK_LOG_DIR` | `$AIF_HOME/logs` | Hook log directory |
| `AIF_RULES_DIR` | `rules/` beside `hooks/` | Rules the context hooks point to and the reminder injects |
| `AIF_PLAN_CJS` | `skills/engineering/aif-plan/scripts/plan.cjs` beside `hooks/` | Script that resolves the active plan |
| `AIF_RUNTIME` | detected | `claude-code`, `codex` or `cursor`; picks how a guard blocks and how an approved retry runs |

The runtime is read from `hooks/.runtime.json` (`{"schemaVersion":1,"runtime":"codex"}`) when an
install writes one, then from `AIF_RUNTIME`; a Claude Code plugin install is recognised without
either.

## Installing without the plugin

`scripts/aif-install.cjs` (the `aif-install` bin of the npm package) writes the agents, rules and
hooks into a runtime's user config:

```bash
node scripts/aif-install.cjs --runtime claude|codex|omp|cursor|all [--uninstall] [--dry-run] [--home <dir>] [--json]
```

Every hook runtime (Claude Code, Codex, Cursor) runs one shared copy of the hooks from
`~/.aif/hooks/`, with the rules in `~/.aif/rules/` and the plan scripts in
`~/.aif/skills/engineering/aif-plan/scripts/`, where `AIF_RULES_DIR` and `AIF_PLAN_CJS` default to.
That copy has no `.runtime.json`: Codex commands set `AIF_RUNTIME=codex`, Cursor runs each hook
through `cursor-adapter.cjs`, and Claude Code is recognised by `CLAUDE_PROJECT_DIR`.

| Runtime | Agents | Rules | Hooks |
|---|---|---|---|
| `claude` | `~/.claude/agents/aif-*.md` | `~/.claude/rules/aif-*.md` | merged into `~/.claude/settings.json` |
| `codex` | `~/.codex/agents/aif-*.toml`, listed in `config.toml` | a marked block in `~/.codex/AGENTS.md` | `~/.codex/hooks.json`; `[features] hooks = true` |
| `omp` | `~/.omp/agent/agents/aif-*.md` | `~/.omp/agent/rules/aif-*.md`, two always applied | none |
| `cursor` | `~/.cursor/agents/aif-*.md` | `~/.cursor/rules/aif-*.mdc` | `~/.cursor/hooks.json`: session context, privacy and scout guards |

Cursor's prompt and subagent events cannot add context, so Cursor gets no development-rules
reminder, subagent context or secret-output reminder hook; the rules reach it through the `.mdc`
files, two of them always applied. OMP reads the same frontmatter: a rule with neither
`alwaysApply: true` nor a `description` is never shown to the model.

Codex runs a hook only after you have reviewed it. Codex records the approval as a `trusted_hash`
under `[hooks.state]` in `config.toml`. After installing, start `codex` interactively and approve
the aif hooks when it asks. Until you do, Codex skips them without saying so. The installer never
approves hooks on your behalf.

The installer touches only aif's own entries. It parses every existing config before writing
anything and stops, changing nothing, if one fails to parse. A pre-existing file is copied to
`<file>.aif-bak` before its first change, and every write is recorded in
`~/.aif/install-manifest.json`. A second install changes nothing. `--uninstall` restores each
backup byte for byte when only aif changed the file; when you edited it since, it removes just the
aif entries and keeps the backup. Created files and empty created directories are removed; hook
state, logs and `plans-state.json` are never touched. Use `--dry-run` to see each change first and
`--home` to install somewhere other than your home directory.
