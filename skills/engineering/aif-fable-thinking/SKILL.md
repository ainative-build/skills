---
name: aif-fable-thinking
description: "Reason by the Claude Fable 5.1 protocol: grounded claims, multi-hypothesis diagnosis, self-review, Floor checks for trick questions, Constraint Loops for exact formats."
when_to_use: "Invoke when being right beats being fast: root causes, reviews, architecture, strategy or contested claims."
category: reasoning
keywords: [reasoning, calibration, hypotheses, verification, rigor, evidence, fable-5, fable-5-1, constrained-writing, agentic, orchestration, subagents, runtimes, coding, research, security, vision, token-efficiency, skills, motion, animation, engineering-prose, engineering-standards, system-design, debugging, root-cause, solution-design, first-principles, sequential, creative]
argument-hint: "[task or question to reason through]"
license: MIT
metadata:
  author: ainative-build
  version: "1.6.1"
---

# Evidence and constraint checks

Use this task-dependent aid for contested claims, difficult diagnosis or mechanical output
constraints. Select checks from observed task risk and failures, not a self-assessment of
model capability. Effectiveness claims require matched consumer evaluations with the actual
model/runtime; this protocol does not guarantee better reasoning on every task.

For uncertain decisions, use `references/reasoning-protocol.md` selectively. Report decisions,
observations and limitations, not private reasoning transcripts. Reuse current evidence and
check load-bearing claims; optional playbooks do not create global completion gates.

## The Constraint Loop (hard output constraints — never Direct)

Some asks place a mechanically checkable constraint on the output's surface form rather
than its meaning: forbidden or required symbols, exact counts of words or sentences or
characters, positional patterns, length or rhyme schemes, strict formats. These look
trivial and are the opposite: you generate meaning-first and read your own text as
tokens, so the constraint sits exactly where your perception is weakest. Treat the
constraint — not the content — as the hard part of the task.

Run this loop for every such task:

1. **Expand the constraint before drafting.** Restate it as a mechanical test that every
   governed unit of the output must pass. Enumerate the on-topic vocabulary most likely
   to violate it — starting with the subject's own name, which the constraint may rule
   out — and choose compliant substitutes before writing a single sentence. If the
   constraint governs counts or positions, decide how you will count before drafting.
2. **Draft in your reasoning space**, never directly into the final answer.
3. **Verify mechanically.** If the runtime has tools, run the check — a script or search
   is the strongest evidence and costs seconds. Without tools, decompose the text into
   the units the constraint governs (spell each word out symbol by symbol; count units
   with an explicit running index) and test every unit against the constraint, one by
   one. Re-reading the draft and judging that it passes is not verification; it is the
   exact blindness that produces the violation.
4. **Repair and re-verify.** Replace each violating unit, then re-verify the replacement
   and re-scan the full text — a fix can introduce a new violation. Loop until one
   complete pass over the final text is clean.
5. **Deliver the verified text verbatim.** Any post-verification rewording, however small,
   invalidates the check — re-run step 3 if you touch a single unit.

Claim Discipline applies with no exceptions: "the output satisfies the constraint" is
OBSERVED only after step 3 has run on the exact delivered text. Asserted from re-reading,
it is ASSUMED wearing OBSERVED grammar — a hallucination about your own output, the most
avoidable kind.

## Claim Discipline (runs through every move)

Type every load-bearing statement — mentally in Standard mode, in writing in Full mode:

| Type | Meaning | Allowed grammar |
|------|---------|-----------------|
| **OBSERVED** | You saw it this session: ran it, read it, measured it | "X is / does / returns …" |
| **DERIVED** | Follows from OBSERVED facts via a mechanism you can state | "X should / will / implies …" plus the why |
| **PRIOR** | Training knowledge; may be stale | "X is typically … / was, as of …" — verify if load-bearing |
| **ASSUMED** | Unverified and required by the conclusion | "I am assuming X — if wrong, then …" |

Rules:

- Hallucination is PRIOR or ASSUMED wearing OBSERVED grammar. The grammar is the tell.
- Claims are promoted only by tools (checking a PRIOR makes it OBSERVED) — never by
  restating them more confidently.
- Downgrade honestly: when the environment changes, an earlier OBSERVED becomes PRIOR.
- "I don't know", followed by what would settle it, is a first-class answer.


## Domain Playbooks (load by deliverable type)

Each reference applies this protocol to one domain: its failure modes, the moves in domain
order, evaluable quality criteria, a slop catalog, habitually missed details, a verify
loop, and a Do / Don't table. Load a matching playbook only when that task needs additional guidance; do not run the full catalog.

| Load | When |
|------|------|
| `references/worked-examples.md` | Before first use in Full mode, or to see the moves applied end to end: trick question, bug diagnosis, code review, metrics analysis, root cause with prevention, solution exploration, delegate verification. |
| `references/agentic-long-horizon.md` | Any task spanning many steps, tool calls, or sessions: autonomous runs, migrations, multi-file features, delegated or parallel work. |
| `references/subagent-orchestration.md` | Before spawning any sub-agent or worker: delegate-or-not, the delegation packet, disjoint ownership, fan-in, verifying delegate reports. |
| `references/runtime-orchestration.md` | Work spanning more than one agent runtime or vendor: capability inventory, portable instructions, handoff receipts, mutation isolation, routing by fit and cost. |
| `references/coding-taste.md` | Before changing, reviewing, or debugging code beyond a rename: root cause, invariant ledger, surgical edits, discriminating tests. |
| `references/engineering-standards.md` | Writing or reviewing non-trivial code; any module, service, schema, API, or infrastructure design; design reviews: principles, code standards, system design standards, review checklist. |
| `references/debugging-root-cause.md` | Any failure, flaky behavior, regression, incident, or recurring bug: reproduce, differential diagnosis, causal chain to the root, fix at the cause's altitude, prove both ways, prevent recurrence. |
| `references/solution-exploration.md` | Before committing to an approach: criteria first, a real option set, cheapest kill-tests, timeboxed spikes, simplest sufficient choice, legible decision record. |
| `references/research-taste.md` | Investigations, comparisons, literature or market scans, "what is the state of X", any synthesis from many sources. |
| `references/design-taste.md` | Before writing markup, styles, or component code for anything a human looks at; UX flows, forms, states, accessibility; UI reviews. |
| `references/motion-taste.md` | Anything that moves: UI transitions and micro-interactions, loading states, animated charts, motion graphics and video sequences, slide builds, code-driven animation; reviews of motion. |
| `references/content-taste.md` | Before drafting, editing, reviewing, or translating prose a human reads, in English or Vietnamese: docs, posts, copy, emails, reports, microcopy. |
| `references/engineering-prose.md` | Commit messages, PR descriptions, issue reports, review comments, changelogs, READMEs and docs pages, decision records, runbooks, and instructions written for a model (prompts, skills, harness files, packets). |
| `references/document-vision.md` | Any input that is an image, PDF, scan, screenshot, slide, chart, diagram, or a table inside a picture. |
| `references/security-taste.md` | Code or reviews touching auth, sessions, input parsing, files, payments, secrets, crypto, outbound requests, LLM tool integrations, CI/CD. |
| `references/thinking-modes.md` | The conventional answer violates a constraint (first principles); a long dependent chain needs visible revision (sequential); every option fails (creative). |
| `references/token-economy.md` | Constrained budgets, many-tool-call tasks, sub-agent effort settings, or a similar run that felt slow or verbose. |
| `references/skill-usage.md` | Routing a task to a skill, a user naming a skill or slash command, a skill script failing, first use of a third-party skill: live-catalog discovery, progressive loading, precedence, script inspection, outcome verification. |
