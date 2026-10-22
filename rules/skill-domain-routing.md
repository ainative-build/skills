# Skill Domain Routing

Route domain work to the aif skills below, confirmed against the runtime's live
installed-skill catalog. The catalog is the availability authority: skip a
skill it does not list.

## Routing Procedure

1. Read the live skill catalog supplied by the runtime.
2. Match the user's primary intent to a capability below.
3. Select an installed skill whose metadata explicitly covers that capability.
4. Read that skill's complete instructions before acting.
5. If no installed skill matches, continue with the primary workflow and
   available native capabilities. Do not recommend or invoke an absent skill.

## Capability Map

| User intent | Skill |
|-------------|-------|
| Locate code or understand a repository | `aif-scout` |
| Research a technology, library or approach | `aif-research` |
| Get a second opinion or pressure-test a plan | `aif-advise` |
| Diagnose a failure or prove a root cause | `aif-debug`, then `aif-fix` |
| Test code or design a suite | `aif-test`; web E2E and unit tooling in `aif-web-testing` |
| Drive a browser | `aif-agent-browser`; the user's own Chrome profile via `aif-chrome-profile` |
| Review code or a PR | `aif-code-review` |
| Commit, branch, open or merge a PR | `aif-git`; release via `aif-ship` |
| Analyze or generate images, audio, video or documents | `aif-ai-multimodal` |
| Reason through a hard problem | `aif-problem-solving`, `aif-deep-thinking` |
| Record work history | `aif-journal` |

## Usage Rules

- Pick one primary skill per distinct intent; add a secondary skill only when
  the task genuinely crosses domains.
- Treat installed skill metadata as the availability and routing authority.
- Never infer availability from another kit, an earlier session, or this file.
- Run selected domain skills inside `primary-workflow.md`; do not restate its
  delivery sequence here.
