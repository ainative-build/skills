# Anti-AI-slop (Standards lens)

Loaded by the Standards axis. LLM-assisted changes often compile, pass tests, and look fine
per-file, yet pollute the codebase in aggregate. This lens catches that. It is a code-quality
concern — findings live under `## Standards`, not a separate axis.

**Severity rule (prevents cosmetic churn):**
- **Structural** slop → **High** (one bad call infects many files later).
- **Micro** slop → **Low/Medium** (local, cheap to leave; flag but don't over-weight).

Give evidence like any finding: cite `file:line` and, where cheap, verify (e.g. grep that shows the
duplicate already exists).

## Structural slop (High)

- **Dumping-ground file** — new `utils/helpers.*`, `lib/common/*`, `*manager.*` with a generic,
  domain-less name. Evidence: `git diff --diff-filter=A --name-only` shows the new generic file.
  Fix: domain-anchored name, or move the fn into its only caller.
- **Parallel reimplementation** — a new `formatDate`/`slugify`/`chunk`/retry-wrapper the repo
  already has. Evidence: grep the repo for the prior art and cite it. Fix: use/extend the existing one.
- **Premature abstraction** — new interface + factory/builder for one implementation and ≤2 callers.
  Evidence: count concrete implementations = 1. Fix: inline the concrete type; abstract when the
  second implementation actually arrives.
- **Config flag for a constant** — new `ENABLE_X`/`USE_NEW_Y` for behavior that will never be
  flipped in prod. Fix: pick the value, hardcode, delete the plumbing.
- **Schema/contract change without migration or version bump.**
- **File grown past the project's size limit without splitting.**

## Micro slop (Low/Medium)

- **Defensive paranoia** — try/catch around code that can't throw; null checks on typed-non-null params.
- **Catch-and-swallow** — `catch (e) { console.log(e) }` / `catch { return null }` (loses the error).
- **Over-comment** — comments paraphrasing the next line (`// increment counter` over `counter++`).
- **One-line wrapper** adding indirection with no value.
- **Reimplementing stdlib** (`chunk`, `range`, `groupBy`) the language/deps already cover.
- **Silencing not fixing** — `any` widening, `@ts-ignore`, `eslint-disable` added to mute a warning.
- **Phantom test coverage** — tests that execute lines but assert nothing meaningful.
- **Scope mismatch** — diff size doesn't match stated intent ("fix typo", +800/−60); files touched
  unrelated to the stated purpose; generic LLM commit prose ("improve code quality and enhance maintainability").

## Do NOT become a witch-hunt

- Judge YAGNI vs slop by evidence, not vibes — a second caller or a real variance justifies an
  abstraction; say why when you flag one.
- Don't flag genuine domain code as slop because it's new.
- Micro slop is a nudge, not a blocker — never let it drive a "Request changes" verdict on its own.
