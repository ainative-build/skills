# ainative-build / skills

Portable, self-contained coding-agent skills. Install once, run on Claude Code, Codex, or Cursor.

Skills:
- **`aif-code-review`** — adversarial, axis-separated code review that runs Standards, Spec, and
  Adversarial passes in isolation and never merges or re-ranks their findings.
- **`aif-recon`** — fast codebase reconnaissance: turn a task, diff, or question into a concise map
  of relevant files, dependents, tests, and the governing spec. `aif-code-review` uses it for its
  codebase + spec exploration when both are installed, and falls back to built-in scouting otherwise.
- **`aif-improve`** — architectural deepening finder: scans existing code for shallow modules,
  coupling, and missing seams, and reports evidence-ranked candidates using the deletion test. It is
  read-only until you pick a candidate; only then does it design and implement the change with you.

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
/aif-code-review                 # recent changes
/aif-code-review #123            # a GitHub PR
/aif-code-review abc1234         # a specific commit
/aif-code-review --pending       # staged + unstaged
/aif-code-review <ref>           # fixed-point diff <ref>...HEAD
/aif-code-review codebase        # single-pass whole-codebase scan

/aif-recon <task | files | question>   # map relevant files, dependents, tests
/aif-recon <question> --spec           # also find the governing spec / PRD / issue

/aif-improve                     # scan the whole repo for deepening opportunities
/aif-improve src/payments/       # a scoped path or area
/aif-improve "the auth flow"     # an area named in prose
/aif-improve … --html            # also emit the before/after visual report
```

These are the skills.sh trigger names (skill invoked directly, e.g. `/aif-code-review`). Installed as
the Claude Code **plugin** instead, the same commands are namespaced with a colon —
`/aif:code-review`, `/aif:recon`, `/aif:improve`.

Every review reports three separate axes — **Standards** (Fowler code smells + structure, logic,
types, performance), **Spec** (does it match the originating issue/PRD), and **Adversarial**
(security and failure-mode red-team) — plus the single most-significant issue per axis. It refuses
to claim anything is "fixed" or "passing" without citing the verification command and its output.

## Credits

`aif-code-review`'s two-axis (Standards vs Spec) separation and fixed-point-diff model, and
`aif-improve`'s deep-module improvement workflow (the deletion test, seams, recommendation-strength
ranking, the explore→present→deepen shape), are approaches adapted from
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT). The deep-module lens itself comes
from John Ousterhout's *A Philosophy of Software Design*. The wording and implementation in this
package are our own. Adversarial always-on review, multi-mode input resolution, and verification gates
derive from the ainative-build / claudekit code-review lineage.

## License

MIT © 2026 ainative-build. See [LICENSE](./LICENSE).
