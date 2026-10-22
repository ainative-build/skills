# Quick workflow

Reuse the opening contract. Locate the failing file and direct dependencies, record the
pre-fix error/command, and identify the concrete cause. If multiple meaningful repairs or
architecture decisions remain, route to standard/deep before editing.

Implement the direct repair. Rerun the failing command and the smallest related check.
For a type/lint error its checker is regression evidence; for behavior add a test that fails
without the fix when useful. Inspect the diff and affected caller contracts. Independent
review is risk-based; direct execution is sufficient for low-risk one-file repairs.

Repair failures caused by this change within scope. Under `--chef`, a failed verification
on a change believed complete requires chef counsel before edits or re-diagnosis; quick
does not waive that contract. Explicit `--review` retains human checkpoints.

Reconcile an existing plan only if one exists; assess docs impact, report cause and before/
after evidence, and run `/aif-journal` only as allowed by SKILL.md's **Journal step — opt-out**.
Git actions require their
own authorization. No blanket reasoning skill, parallel lint agents or finalizer is required.
