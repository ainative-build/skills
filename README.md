# ainative-build / skills

Portable, self-contained coding-agent skills. Install once, run on Claude Code, Codex, or Cursor.

Skills:
- **`aif-code-review`** — adversarial, axis-separated code review that runs Standards, Spec, and
  Adversarial passes in isolation and never merges or re-ranks their findings.
- **`aif-recon`** — fast codebase reconnaissance: turn a task, diff, or question into a concise map
  of relevant files, dependents, tests, and the governing spec. `aif-code-review` uses it for its
  codebase + spec exploration when both are installed, and falls back to built-in scouting otherwise.

## Install (skills.sh)

```bash
npx skills@latest add ainative-build/skills
```

Installs to the target agent's skills directory:

| Agent | Path | Invoke |
|-------|------|--------|
| Claude Code | `.claude/skills/aif-code-review/` | `/aif-code-review` or model auto-detect |
| Codex | `.agents/skills/aif-code-review/` | model auto-detect |
| Cursor | `.cursor/skills/aif-code-review/` | model auto-detect |

The same `SKILL.md` serves all three — no per-agent variants. On Claude Code the review fans out
into parallel isolated subagents; on Codex/Cursor it degrades to three sequential passes with the
same three-section output.

## Install (Claude Code plugin)

For a read-only, always-current bundle with the clean namespaced command:

```
/plugin marketplace add ainative-build/skills
/plugin install aif
```

Then run **`/aif:code-review`**. The plugin also registers the `@aif:code-reviewer` agent.

## Usage

```
/aif:code-review                 # recent changes
/aif:code-review #123            # a GitHub PR
/aif:code-review abc1234         # a specific commit
/aif:code-review --pending       # staged + unstaged
/aif:code-review <ref>           # fixed-point diff <ref>...HEAD
/aif:code-review codebase        # single-pass whole-codebase scan

/aif:recon <task | files | question>   # map relevant files, dependents, tests
/aif:recon <question> --spec           # also find the governing spec / PRD / issue
```

Every review reports three separate axes — **Standards** (Fowler code smells + structure, logic,
types, performance), **Spec** (does it match the originating issue/PRD), and **Adversarial**
(security and failure-mode red-team) — plus the single most-significant issue per axis. It refuses
to claim anything is "fixed" or "passing" without citing the verification command and its output.

## Credits

The two-axis (Standards vs Spec) separation and fixed-point-diff review model are concepts adapted
from [mattpocock/skills](https://github.com/mattpocock/skills). Prose and implementation here are
original. Adversarial always-on review, multi-mode input resolution, and verification gates derive
from the ainative-build / claudekit code-review lineage.

## License

MIT © 2026 ainative-build. See [LICENSE](./LICENSE).
