## Report Output Mode (`--report`)

When `--report` is present, persist the accepted brainstorm as a durable
markdown report following the installed project-organization skill's
conventions (path resolution, naming, and markdown body standards):

- **Path:** the plan-scoped reports directory (`plans/{plan-dir}/reports/`)
  when an active plan exists, otherwise the standalone `plans/reports/`
  directory — or the injected `Report:` path from the `## Naming` section when
  the runtime provides one.
- **Naming:** timestamped kebab-case per the naming convention, e.g.
  `brainstorm-{YYMMDD-HHmm}-{slug}.md`.
- **Body:** the report template — frontmatter, summary, the contract fields, including Trade-offs and Better approaches when present,
  options considered with trade-offs, recommendation, and unresolved
  questions last.

`--report` composes with every other flag: with `--ultra` the report records the winning candidate plus the short
ranking appendix. Without `--report`, keep the existing behavior — write a
durable summary only when the decision must survive the session or feed a plan.
