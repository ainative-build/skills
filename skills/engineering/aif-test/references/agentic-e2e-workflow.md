# Optional agentic E2E

Use only for a project already using `tester-army/e2e` or a user-requested setup.
Otherwise keep the native route in `ui-testing-workflow.md`. This resource does
not install a runner, enable MCP/provider access or grant model/telemetry consent.

## Resolve capabilities before running

Inspect the installed package, lockfile, local executable help and matching
documentation. Record engine version and capabilities actually observed; never
fetch `latest` implicitly or copy unsupported commands from another version.
Use the project's existing executable and approved test environment. If engine,
model or consent is absent, continue supported native checks and report the gap.

The cache distinctions below were checked against upstream's
[cache contract](https://github.com/tester-army/e2e/blob/8d38206f460415b70706b45acb820bb0e24832ae/docs/cache.mdx)
and [agent steps](https://github.com/tester-army/e2e/blob/8d38206f460415b70706b45acb820bb0e24832ae/docs/agent-steps.mdx).
These are a reference baseline, not a compatibility claim for an installed version.
Recheck the selected version before execution, including report schema and errors.

## Actions and assertions

Use an agent action for a bounded goal. Follow it with deterministic assertions
for important IDs, tenant/workspace, plan, counts, money, permission and side effects.
Model judgments may supplement semantic interpretation; label them accordingly.
A second model/context is not a perfectly independent oracle.

Illustrative expectations, expressed without assuming a version-specific API:

| Weak check | Check that protects the intended contract |
| --- | --- |
| Route looks like `/workspaces/:id/billing` | Exact workspace identity and plan equal the authorized fixture; other tenant access is denied |
| Checkout succeeded somehow | If the claim is the checkout button, activate that exact control and verify one order and the expected amount |
| Agent says the cart looks right | Exact item IDs, quantity and total match accepted inputs |
| Replay completed | Rerun the exact outcome assertions against the current app |

For a goal-only journey, a changed layout may use a different path while preserving
the outcome. For a path-specific claim, an alternate menu/API cannot rescue the
broken control. Record the path actually exercised.

## Replay, live and strict cache

A cache stores actions, not pass evidence. Route/control matching can ignore
changing record IDs or text; it cannot establish the business oracle above.
At the reference baseline, `agent.assert`, `agent.waitFor` and `agent.extract`
still execute live even when `agent.act` replays.

`--strict-cache` is not a no-model guarantee: a cold/no-entry cache, retry, gap,
truncated recording or some store-read failures can still run live. A stale replay
and a missing recording are different cases. A policy forbidding model calls needs
an independently verified enforcement mechanism for the selected version. If none
is available, report unsupported/inconclusive and use the native route; do not
probe the guarantee by making an unauthorized call.

Record observed replay/live/handoff and reasons, raw statuses and error codes.
Warm replay cost, provider prompt-cache savings and billed CI minutes are different
metrics. Do not infer zero calls from a replay hit or zero cost from missing usage.

Local cache does not automatically reach CI. Share only reviewed trusted recordings
through project policy; typed values may be stored verbatim. Do not hand-edit cache
JSON to manufacture passing verification. Use supported re-recording operations.

## Bounded exploration and findings

Use the charter and budgets from the UI workflow. Inspect termination reason,
unfinished steps and coverage of mandatory claims, including when explore reports
pass/no findings. Budget exhaustion is not feature verification.

For each finding, verify the source of the expectation and create a focused repro.
The repro must fail for the target behavior, not missing fixtures, wrong locators,
setup timeouts or provider outage. Preserve raw outcome and add a classification:
confirmed defect, semantic hypothesis, environment/tooling blocker or unknown.
Provider failure is not an application bug, and an assertion failure does not become
pass because a model calls it flaky. Follow `test-lifecycle.md` for regression
admission, intentional behavior changes and authorized repair boundaries.

## Isolation and reporting

Test code/config/plugins are executable, not sandboxed by the engine. Use isolated
test accounts/data without production secrets or privileged write tokens for
untrusted code. Do not assume an origin allowlist; enforce required egress/origin
and side-effect limits outside the prompt. Keep secrets out of instructions,
fixtures and artifacts. Respect pixel/screenshot restrictions after secret fills;
report missing visual evidence instead of bypassing those controls.

Check telemetry/feedback policy before optional execution; do not upload source,
private URLs, reports or credentials without the relevant authorization. Ambient
credentials also do not grant TypeSafe/Jev consumer consent.

Use `report-format.md`, pointing to existing receipts and a fresh run directory.
If a report reader is needed, reuse existing import paths first. Any small local
reader must bound size, validate schema/version and contained artifact references,
preserve unknown/raw statuses, and never execute report commands or download URLs.
Do not build an importer merely to summarize a run.
