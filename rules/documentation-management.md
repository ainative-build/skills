# Project Documentation Management

Use this rule when creating plans or changing project documentation.

## Docs impact

Update docs only when work affects user-visible behavior, setup, commands,
configuration, architecture, security, public contracts, machine-readable
contracts, or durable maintainer decisions. Internal edits and phase completion
do not require evergreen docs churn.

- Authorized work outside the repository that establishes or changes an
  operational route — deploy path, log source, credential source,
  webhook/OAuth/DNS, backup/rollback, or a lookup route proven wrong — is docs
  impact.

Discover the target through repository instructions, the root README, and the
project's existing docs navigation. Do not assume a fixed filename list or docs
tree. Update the smallest owning surface, and link to machine-owned scripts,
manifests, schemas, or generated references instead of copying their details.

## Plans

Follow the repository's configured plan location and naming convention. Keep a
plan index short: status, phases, dependencies, acceptance criteria, and links
to execution detail. Phase files contain only the context, requirements, files,
steps, validation, risk, and rollback information needed to execute safely.

Plans, reports, and audit results are stateful records. They do not become
evergreen product authority merely because a phase completed.

Before updating a document, read it. After updating, verify links and claims
against source, tests, scripts, artifacts, or live state.
