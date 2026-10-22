# Engineering Prose — the reasoning protocol applied to the writing agents do most

Commit messages, pull request descriptions, issue reports, review comments, changelogs,
READMEs, documentation pages, decision records, runbooks, and instructions written for
other models. This is most of the prose a coding agent produces. It is read by people
under time pressure and by future agents mining history, and fluent filler does lasting
damage here: a vague commit poisons every later bisect, a PR body that lists commits hides
the risk, a review comment without a location costs a round-trip.
`references/content-taste.md` governs voice and slop; this reference governs the forms.

## When to load this reference

Load BEFORE writing a commit message, a PR or MR description, an issue or bug report, a
code review comment or summary, a changelog or release note, a README or docs page, an
architecture decision record, a runbook, or any text a model will read as instructions
(system prompt, skill, harness file, delegation packet). The trigger is the deliverable
type. Load `references/content-taste.md` with it whenever voice matters — most docs, all
release notes.

## Know Your Own Defaults (engineering-prose failure modes)

- **Log as description** — the PR body is the commit list; the changelog is the git log.
  The reader wanted impact and risk.
- **What without why** — "update handler". The diff already shows what; only the message
  can carry why, and why is what the bisecting engineer needs.
- **Review vagueness** — "this could be cleaner": no location, no mechanism, no fix, no
  severity.
- **Doc-type blending** — one page that is tutorial, reference, and essay at once, and
  serves none of the three readers.
- **Untested examples** — snippets never run, commands with stale flags, versions
  unstated, outputs imagined.
- **Instruction padding** — for model readers: motivational prose, adjectives in place
  of rules ("be very careful"), rules without precedence, nothing checkable.
- **Ticket theater** — "it doesn't work" without version, steps, expected versus actual,
  or evidence.
- **Tone at the person** — praise or harshness aimed at the author instead of the code.

## How to think (the moves, in engineering-prose order)

1. **FRAME the reader and their read time.** A commit is read by someone bisecting at
   two in the morning; a PR by a reviewer with ten minutes; a docs page by someone
   mid-task; a prompt by a model with no context but the text. Write for that reader's
   next action.
2. **Lead with the effect on the reader**, not with the work you did.
3. **Spend specificity:** file, function, flag, version, command, number.
4. **State evidence as evidence** — what you ran and what it returned, per Claim
   Discipline. "Tested locally" is not evidence; the command and its result are.
5. **Name risk and scope:** what could break, what was left out, what was not reviewed.
6. **Subtract:** no narrative of your process, no restating the diff, no closing summary.

## Forms (the evaluable shape of each)

### Commit message

- Subject in the imperative, about 50 characters and never past 72, using the repo's
  conventional type and scope when it has them; it names the behavior change, not the
  file touched.
- Body after one blank line: why (the problem, the constraint, the alternative rejected),
  then any non-obvious how. Wrap at 72.
- Footers: issue references; a breaking-change footer with the migration step.
- One logical change per commit. Never: "update", "fix stuff", "WIP", AI attribution,
  plan or finding identifiers.

### Pull request description

```text
What: <behavior change, one or two sentences>
Why: <the problem; issue link>
How: <approach; decisions taken and alternatives rejected>
Tested: <command -> result, ...; what was NOT tested>
Risk / rollout: <blast radius, migrations, flags, rollback>
Docs impact: <updated <path> | none, because ...>
```

Add a "look hardest at" line naming the file and reason; screenshots or recordings for UI
changes; before-and-after numbers for performance. Follow the repo's PR template when one
exists.

### Issue and bug report

- Title = symptom plus condition ("Login returns 500 when the email contains a plus
  sign"), never "Login broken".
- Environment and exact versions; minimal reproduction steps; expected versus actual;
  evidence (error text and log lines in a fenced block); what was already ruled out;
  impact and frequency. A hypothesis is labeled as one.
- Search existing issues first; reference duplicates and related items.

### Code review comment

- Location first (file and line, or the quoted snippet), then the defect as a mechanism
  ("X is nil when Y, so Z panics on the first request"), never as a preference.
- Severity tag on every comment: blocking, should, nit, or question. One point per
  comment; a concrete fix or suggested diff.
- Praise specific things. Tone at the code, never the author. A question is asked when
  you are genuinely unsure, not as a softened command.
- Summary comment: verdict first (approve, request changes), then the blocking items,
  then the rest, then what was not reviewed.

### Changelog and release notes

- Group by reader impact: Breaking, Added, Changed, Fixed, Security, Deprecated. Each
  entry says what changed for the user and what they must do, with a PR or issue link.
- Breaking entries carry the migration step. Write from the user's side ("the force flag
  now preserves unrelated files"), not the code's ("refactored the collision planner").
- Version, date, and compare link present; no internal ticket identifiers in user-facing
  notes.

### README and documentation pages

- One page, one type: tutorial (a learner, one path, guaranteed success), how-to (a goal,
  numbered steps, assumes competence), reference (complete, structured, dry, generated
  where possible), explanation (why, trade-offs, history). Mixed pages fail every reader.
- README order: what it is in one sentence, who it is for, install, one quick start that
  works, links to the rest. Badges do not replace the sentence.
- Every command is copy-pasteable; every snippet runs or is marked as pseudo-code;
  prerequisites and versions are named; output is shown when the output is the point.
- Link machine-owned truth (schemas, generated references, scripts) instead of copying
  it; copies rot. Update the smallest owning surface; delete stale sections rather than
  appending "note: this changed in version X".

### Decision records and runbooks

- ADR: context, decision, alternatives with why-not, consequences, status, date.
  Decisions, not narrative.
- Runbook: trigger, preconditions, numbered steps each with the exact command and its
  expected output, verification, rollback, escalation.

### Writing for a model reader (prompts, skills, harness files, delegation packets)

- The reader has no context but the text. Put everything it needs in the text: decisions,
  paths, criteria, environment — not the history that produced them.
- Imperative, testable instructions: "run X; if Y, do Z" beats "be careful with X". Each
  rule should be checkable by reading an output.
- State precedence wherever rules can conflict ("when A and B conflict, A wins").
- Prefer positive instructions; a bare "don't" leaves the model choosing the
  next-likeliest wrong thing.
- Examples over adjectives: one good and one bad example beat a paragraph of qualities.
- Critical constraints at the start and again at the end; long middles get lost.
- No persuasion, flattery, or threats; no "you are a world-class…". Capability wording
  instead of tool names so the text runs on any runtime
  (`references/runtime-orchestration.md`).
- Every sentence costs every future run: keep it short.

## What to avoid (the slop catalog — matches are failed gates)

- "Update code", "Various fixes", "Address review comments".
- A PR body reading "This PR does what the title says", or a pasted commit list.
- "LGTM" on a change that includes an untested migration.
- "Consider refactoring this" with no location, mechanism, severity, or fix.
- A README opening "Welcome to X, a powerful and flexible…".
- A docs section headed "Note: this may be outdated".
- A prompt opening "You are an expert… Always be extremely careful and thorough."
- AI attribution or plan and finding identifiers in commit subjects.

## Details models habitually miss

- The repository's own conventions outrank this reference: commitlint configuration, PR
  template, code owners, docs layout. Read them before writing.
- A docs-impact statement in every PR, even "none, because…".
- Secrets and personal data in examples, logs, and screenshots: redact before pasting.
- Locale, time zone, and exact versions in reproduction steps.
- Breaking-change footers drive release tooling; a forgotten one hides a major bump.
- Generated documentation: edit the source, never the output.
- Bilingual repositories: one language per artifact class, stated once.
- Issue closing keywords: only the first reference in a list auto-closes on some hosts;
  verify issue state after merge.

## Verify (the loop)

1. Re-read the diff, then the message: does the message say what the diff cannot?
2. Run every command and snippet in the doc in a clean shell; paste real outputs.
3. Check that links resolve and versions match the lockfile or release.
4. Review comments: each carries location, mechanism, severity, and fix.
5. Model-facing text: read it as a stranger with no context; every instruction checkable;
   conflicts resolved by stated precedence; a portability pass for tool names, slash
   tokens, and model names.
6. Slop scan against this catalog and the catalogs in `references/content-taste.md`.

## Evaluate before delivering (act-backed, per the Self-Review Gate)

| Dimension | Passes when | Proven by |
|-----------|-------------|-----------|
| Reader | the form is written for its reader's next action | FRAME note |
| Why | commit, PR, and ADR state the reason, not only the change | body check |
| Evidence | commands and results shown; untested parts named | tested section |
| Actionability | reviews and issues carry location plus fix | per-comment audit |
| Runnable | every snippet and command executed | clean-shell run |
| Portability | model-facing text carries no runtime-specific tokens | lint pass |

## Do / Don't

| Don't | Instead |
|-------|---------|
| Describe the diff in the commit body | Explain why; let the diff show what |
| Paste the commit list as the PR body | What, why, how, tested, risk, docs impact |
| Write "this could be cleaner" | Location, mechanism, severity, concrete fix |
| Ship a snippet you never ran | Run it in a clean shell; paste the real output |
| Mix tutorial, reference, and essay on one page | One page, one type, one reader |
| Tell a model to "be careful" | Give a checkable rule with stated precedence |
| Open a README with adjectives | Open with what it is and one working quick start |
