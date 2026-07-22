# Plugin-path verification

The `npx skills add` path is verified. This checklist covers the **Claude Code plugin** path, which
needs an interactive Claude Code session (the `/plugin` command can't run from a shell).

Run these in a scratch project (NOT one that already has a `code-review` skill, so nothing is
masked).

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

- **Expect:** `/aif:code-review`.
- **If instead you see `/aif:aif-code-review`:** the command alias didn't take. Fix: confirm
  `commands/code-review.md` exists at plugin root (not under `.claude-plugin/`). Worst case, accept
  the longer form — it still works.

## 4. Run a real review

Make a small change in the scratch repo, then:

```
/aif:code-review --pending
```

**Expect:**
- three separate sections — `## Standards`, `## Spec`, `## Adversarial` — never merged/re-ranked;
- a `## Verification` section that refuses to claim "pass/fixed" without a cited command;
- it reviews the actual pending changes (the `--pending` fix: it snapshots to a patch, it does NOT
  run a `BASE..HEAD` diff that would miss uncommitted work).

Also spot-check `/aif:code-review <ref>` (fixed-point) and `/aif:code-review codebase` (whole-tree,
still three separate axes).

## 5. Verify the bundled agent

Ask Claude to spawn the reviewer directly, e.g. "use the aif code-reviewer on this diff".

- **Expect:** the `@aif:code-reviewer` subagent runs read-only (Glob/Grep/Read/Bash), returns one
  axis's findings, ends with `Status: DONE`.

## 6. Verify auto-trigger by description (the B3 check)

WITHOUT typing the slash command, say: **"review my changes"**.

- **Expect:** the `aif-code-review` skill auto-activates from its description triggers. This is the
  one behavior the category-nested skill path (`skills/engineering/aif-code-review/`) might miss in
  plugin mode.
- **If it does NOT auto-trigger:** the plugin's skill auto-discovery didn't recurse the `engineering/`
  category. Fix options: (a) add a top-level `skills/aif-code-review/` that points at the same
  SKILL.md, or (b) rely on the `/aif:code-review` command (step 3), which works regardless.

## 7. Parallel-vs-sequential parity

Run the same small diff two ways and compare:
- plugin on Claude Code (parallel isolated subagents), and
- the skill on a runtime without subagents (Codex/Cursor, or force sequential).

**Expect:** identical three-heading structure; only the dispatch note in `## Scope` differs
(`parallel` vs `sequential`).

## Record results

Tick each step. Anything that fails maps to a concrete fix above — none block the `npx skills add`
path, which is already verified.
