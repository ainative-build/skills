# Video Analysis

Use the npm-latest Multix invocation from `../SKILL.md`. Resolve current
provider models, input methods, formats, duration/context limits, retention,
YouTube support, and pricing from live provider documentation.

## Workflow

1. State the required output: summary, transcript, scene map, comparison,
   timestamps, or structured extraction.
2. Inspect the pinned analysis/transcription command with `--help`.
3. Verify the chosen model and upload method against the live provider limits.
4. Split or compress media when the verified boundary requires it.
5. Ask for timestamped evidence and distinguish observed content from inference.
6. Validate important timestamps against the source before publishing.
7. Delete provider-hosted files when the live API and task require cleanup.

```bash
<latest-multix> gemini analyze \
  --files video.mp4 \
  --prompt "Return a timestamped scene summary and unresolved ambiguities" \
  --format markdown \
  --output analysis.md
```

Never encode provider token math, maximum duration, file expiry, model status,
or a recommended model in this reference.
