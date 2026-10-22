# A/B tasks: aif fork vs AgentKit

Six fixed tasks compare the fork with AgentKit 3.0.0-beta.35. Run each task once per kit, with the same runtime, model and starting commit.

## Fixture

Start each run from a fresh copy of the `slugkit` fixture at the same commit:

- `src/slug.js` exports `slugify(title)`, which only lowercases and replaces spaces with `-`.
- `test/slug.test.js` has one passing test.
- `npm test` runs `node --test`.

Seed the bug for tasks 1 and 2 by adding this failing test before the run:

```js
test('collapses punctuation and repeated separators', () => {
  assert.equal(slugify('  Hello,  World!  '), 'hello-world');
});
```

## Tasks

| # | Skill | Prompt (identical for both kits; only the skill prefix changes) |
|---|---|---|
| 1 | fix | `/<kit>-fix npm test fails on the punctuation test` |
| 2 | debug | `/<kit>-debug why does slugify('  Hello,  World!  ') not return hello-world? Do not change code.` |
| 3 | test | `/<kit>-test add tests for empty input, unicode accents and numbers, then run the suite` |
| 4 | plan | `/<kit>-plan --fast add a slugify option {maxLength} that never cuts a word in half` |
| 5 | brainstorm | `/<kit>-brainstorm should slugify transliterate non-Latin scripts or drop them?` |
| 6 | research | `/<kit>-research best maintained npm packages for slug generation in 2026, with trade-offs` |

`<kit>` is `ak` for AgentKit and `aif` for the fork.

## Scoring rubric

Score each run on two binary measures.

**Completed (0 or 1):**

| Task | Counts as completed when |
|---|---|
| 1 | `npm test` exits 0 and the fix does not weaken or delete the seeded test. |
| 2 | The answer names the cause (only spaces are replaced; punctuation and runs of spaces are kept) and no source file changed. |
| 3 | The three new cases exist and the suite was run, with the result stated. |
| 4 | A plan directory exists with a `plan.md` and at least one phase file that has acceptance criteria. |
| 5 | The answer compares at least two options with trade-offs and ends with a recommendation or a question for the user. |
| 6 | The answer names at least two packages, with sources or links. |

**Cites verification evidence (0 or 1):** the final answer quotes a command it ran and that command's output (tasks 1–3), cites file or source evidence (tasks 2, 5, 6), or shows the plan validator passing (task 4).

## Recording

Record one row per run in the verification report:

| Runtime | Task | Kit | Completed | Evidence | Notes |
|---|---|---|---|---|---|

The fork **matches** AgentKit on a runtime when its total in each column is greater than or equal to AgentKit's total.
