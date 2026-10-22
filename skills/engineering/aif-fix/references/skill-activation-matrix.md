# Optional capabilities by need

| Need | Capability |
|---|---|
| Clear local failure | Direct file reads, cause-aligned repair, relevant checker |
| Unclear causal path | `aif-debug` and one discriminating test |
| Repeated refuted hypotheses | `aif-problem-solving` if reframing would help |
| Difficult evidence comparison | `aif-deep-thinking` (sequential mode) for a decision/evidence log |
| Multiple viable fixes | `aif-brainstorm` after diagnosis |
| Complex phases | Existing plan and optional live progress tracking |
| Independent areas/issues | Delegates with disjoint ownership when authorized and available |
| Cross-module/public-contract risk | Independent review where available or required |
| Changed docs contract | Smallest owning docs update |

Quick does not automatically load any helper. Standard/deep add only the capabilities the
failure needs. `--chef`, `--review` and `--pro-max` retain their explicit contracts. Pass current
scope and existing evidence so helpers do not repeat completed gates.
Never infer git authorization from completing a fix.
