# Plugin-path verification

The `npx skills add` path is verified. This checklist covers the **Claude Code plugin** path, which
needs an interactive Claude Code session (the `/plugin` command can't run from a shell).

Run these in a scratch project that has no other skill of the same name, so nothing is masked.
`<skill>` below is any skill shipped under `skills/engineering/aif-<skill>/`.

## 1. Add the marketplace

```
/plugin marketplace add ainative-build/skills
```

**Expect:** marketplace `ainative-build` added; plugin `aif` listed. If it errors on
`source: "./"`, edit `.claude-plugin/marketplace.json` to `"source": "."` and retry (the one
schema detail not shell-verifiable).

## 2. Install the plugin

```
/plugin install aif@ainative-build
```

**Expect:** `aif` installed. Restart the session if prompted.

## 3. Verify the command namespace

Type `/aif` and let it autocomplete.

- **Expect:** `/aif:<skill>` for each shipped skill.
- **If instead you see `/aif:aif-<skill>`:** the command alias didn't take. Fix: confirm
  `commands/<skill>.md` exists at plugin root (not under `.claude-plugin/`). Worst case, accept
  the longer form — it still works.

## 4. Verify auto-trigger by description

WITHOUT typing the slash command, phrase a request that matches one of the skill's description
triggers.

- **Expect:** the `aif-<skill>` skill auto-activates. This is the one behavior the category-nested
  skill path (`skills/engineering/aif-<skill>/`) might miss in plugin mode.
- **If it does NOT auto-trigger:** the plugin's skill auto-discovery didn't recurse the `engineering/`
  category. Fix options: (a) add a top-level `skills/aif-<skill>/` that points at the same
  SKILL.md, or (b) rely on the `/aif:<skill>` command (step 3), which works regardless.

## 5. Verify agents and hooks

- Run `/agents` and confirm the 15 `aif-*` agents are listed under the plugin.
- Start a new session and confirm the injected context names the project's plans directory
  (session-init) and, after a prompt, the development rules (dev-rules-reminder).
- Ask the agent to read a dotenv file in the scratch project. **Expect:** the privacy guard blocks
  it and asks for approval as described in `rules/hook-response-protocol.md`.
- **If none of the hooks fire:** check that `hooks/hooks.json` sits at plugin root and that `node`
  is on `PATH` for the Claude Code process.

## Record results

Tick each step. Anything that fails maps to a concrete fix above — none block the `npx skills add`
path, which is already verified.
