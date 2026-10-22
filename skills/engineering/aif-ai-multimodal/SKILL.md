---
name: aif-ai-multimodal
description: "Analyze and generate image, audio, video and document content, falling back from native vision to the Multix CLI and live provider catalogs."
when_to_use: "Invoke for media generation, transcription or OCR the model cannot do."
category: media
keywords: [vision, image, video, audio, Gemini]
license: MIT
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
argument-hint: "[file-path] [prompt]"
metadata:
  author: ainative-build
  version: "1.0.0"
---

# AI Multimodal

Process audio, images, videos, and documents with the latest npm release of
`@mrgoonie/multix`. Use the `npx` invocation shown here; do not install or
call a global `multix`. Multix is a fallback route, not the default one —
resolve `## Routing` before running any command below.

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix --version
```

## Routing

Decide the route before invoking Multix. Do not select a route speculatively.

| Task | Preferred route | Route to Multix only when |
|------|------|------|
| Image/document visual understanding (OCR, layout, description, extraction) | **Native vision** — inspect the file directly in this session | Native vision is unavailable/ineligible, the input exceeds its documented limits, or the user explicitly requests Multix or a specific provider |
| Image generation/editing | Multix | A compatible image-generation key (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `MINIMAX_API_KEY`) is already configured |
| Video generation | Multix | A compatible video-generation key (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `MINIMAX_API_KEY`) is already configured |
| TTS, music, audio transcription | Multix | A compatible audio/music key is already configured (`GEMINI_API_KEY` for transcription, `MINIMAX_API_KEY` for speech/music) |

### 1. Native vision takes precedence

For image/document visual-understanding tasks, read and analyze the file
directly in this session instead of invoking Multix, whenever the active
model is vision-capable and the input fits its documented limits (format,
size, page/frame count). Do not invoke Multix for a task native vision can
already handle.

Fall back to Multix only when the case is one of these, and state which one:

- the active session has no native vision capability;
- the input exceeds native vision's documented limits (e.g. long video, an
  unsupported format, a document beyond its page/size limit);
- the user explicitly asked for Multix or a specific provider/model.

### 2. Multix requires an already-configured, capability-matched credential

Never invoke Multix speculatively or to probe for capability. Before running
any `multix` command:

1. Identify the requested capability: visual analysis/OCR, image generation,
   video generation, or audio/music (transcription, TTS, music).
2. Check only whether the relevant credential is *present*; never print its
   value or the contents of `.env`:

   ```bash
   [ -n "$GEMINI_API_KEY" ] && echo "gemini: configured" || echo "gemini: missing"
   [ -n "$OPENROUTER_API_KEY" ] && echo "openrouter: configured" || echo "openrouter: missing"
   [ -n "$MINIMAX_API_KEY" ] && echo "minimax: configured" || echo "minimax: missing"
   ```

3. Route only to a provider whose configured key actually covers the
   requested capability — a key configured for one modality does not
   authorize a route it cannot fulfill (e.g. an image-only OpenRouter key
   does not authorize a music/speech route). Confirm current per-capability
   coverage against the provider docs in `## Resources`.
4. Never infer, request interactively, generate, or silently probe for a
   missing credential. If the needed key isn't configured, name it from
   `## Setup` and stop.

### 3. No eligible route

When native vision cannot handle the task and no capability-matched
credential is configured, do not guess a route. State the blocker plainly —
no native capability, missing credential, unsupported task, or
provider/task capability mismatch — and name the specific env var or
capability that would unblock it. Never print credential values or `.env`
contents in this diagnostic.

## Setup

Load `references/setup.md` before the first Multix run: Node.js and API-key
requirements, the `multix check` verification command, and backend-ownership
rules for reporting environment blockers.

## Modality recipes

After resolving Routing, load only the matching reference: visual analysis uses
`references/vision-understanding.md`; image generation/editing uses
`references/image-generation.md`; audio uses `references/audio-processing.md` or
`references/music-generation.md`; video uses `references/video-analysis.md` or
`references/video-generation.md`. For command examples use `references/cli-recipes.md`.

## Provider and Model Resolution

The npm-latest Multix CLI owns command syntax. Provider catalogs own model IDs,
availability, features, limits, pricing, and deprecations. Before generation:

1. Run the relevant npm-latest `multix ... --help` command.
2. Check the provider's current model and pricing documentation.
3. Select an explicit model that supports the requested modality and controls.
4. Record that model in project configuration when reproducibility matters.

Never infer a provider model as "latest," "default," or "recommended" from this skill.

## Failure UX

- **First run / offline**: when npm networking is enabled, `npx --prefer-online` checks the npm registry before each run. For sandboxed or offline sessions, pre-warm with `npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix --version` while network access is available.
- **Node <20**: install Node.js 20+ and rerun the command.
- **Provider key missing**: `multix` reports the missing env var. Export keys in the shell, project `.env`, or `~/.multix/.env`.
- **Environment discovery**: use the locations reported by the resolved CLI; do not infer provider-key search paths from an older backend.
- **Provider API error**: keep the full provider error, redact keys, and retry only after fixing auth, billing, quota, model access, or request parameters.
- **Codex installs**: this skill has no managed runtime package. Codex uses the npm-latest `npx` commands in this file, so pre-warm the npm cache before network-restricted runs.
- **No eligible route**: see `## Routing` §3 — name the blocker (native capability, missing credential, unsupported task, or provider/task mismatch) instead of guessing a route.

If the resolved CLI does not expose a required operation, report the observed gap
and check the upstream issue tracker. Do not revive a parallel local backend.

## References

Load for detailed guidance:

| Topic | File | Description |
|-------|------|-------------|
| Setup | `references/setup.md` | Node.js, API keys, `multix check`, and backend-ownership rules. |
| Music | `references/music-generation.md` | Stable music brief and review workflow; resolve live provider controls. |
| Audio | `references/audio-processing.md` | Stable transcription and generation workflow; resolve live formats, models, limits, and pricing. |
| Images | `references/vision-understanding.md` | Stable OCR and visual-analysis workflow; resolve live input limits. |
| Image Gen | `references/image-generation.md` | Stable generation/editing workflow; resolve live model capabilities and pricing. |
| Video | `references/video-analysis.md` | Stable video-analysis workflow; resolve live inputs and limits. |
| Video Gen | `references/video-generation.md` | Stable video-generation workflow; resolve live controls and models. |
| MiniMax | `references/minimax-generation.md` | Stable multimodal workflow; resolve the live MiniMax catalog. |

## Limits

Provider limits still apply. Resolve current inline/file-upload size,
retention, duration, context, and output limits before execution. When input or
output exceeds the verified limit, split media with `ffmpeg` or the resolved
Multix media command, process segments, then combine the results.

Transcript output should be Markdown with metadata, chunk status, and timestamped
lines:

```text
[HH:MM:SS -> HH:MM:SS] transcript content
```

## Resources

- [multix CLI](https://github.com/mrgoonie/multix-cli)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs/)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [OpenRouter Image Generation Docs](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [OpenRouter Provider Routing](https://openrouter.ai/docs/features/provider-routing)
- [MiniMax API Docs](https://platform.minimax.io/docs/api-reference/api-overview)
- [MiniMax Pricing](https://platform.minimax.io/pricing)
