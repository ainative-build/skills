## Report Output Mode (`--report`)

When `--report` is present, persist the accepted brainstorm as a durable
markdown report, using the injected `## Naming` section (or the `reports.dir`
preference from `prefs.cjs`) for its path and file name:

- **Path:** the reports directory (`.aif/reports/` by default, the
  `reports.dir` preference) — or the injected `Report:` path from the `## Naming` section when
  the runtime provides one.
- **Naming:** timestamped kebab-case per the naming convention, e.g.
  `brainstorm-{YYMMDD-HHmm}-{slug}.md`.
- **Body:** the report template — frontmatter, summary, the contract fields, including Trade-offs and Better approaches when present,
  options considered with trade-offs, recommendation, and unresolved
  questions last.

`--report` composes with every other flag: with `--pro-max` the report records the winning candidate plus the short
ranking appendix. Without `--report`, keep the existing behavior — write a
durable summary only when the decision must survive the session or feed a plan.
