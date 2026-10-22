# Audio Processing

Use the npm-latest Multix invocation from `../SKILL.md`. Provider catalogs
own available transcription, speech, voice, language, streaming, format,
duration, context, retention, and pricing facts.

## Transcription Workflow

1. Inspect the resolved transcription command with `--help`.
2. Verify current input and output limits in provider documentation.
3. Normalize or split audio only when the verified limits require it.
4. Request timestamps, speaker labels, uncertainty markers, and domain terms
   appropriate to the task.
5. Validate names, numbers, quoted language, and action items against the source.
6. Merge segments without inventing text across boundaries.

```bash
<latest-multix> gemini transcribe \
  --files interview.mp3 \
  --prompt "Timestamped transcript with speakers and uncertainty markers" \
  --format markdown \
  --output transcript.md
```

## Generation Workflow

Resolve a current model and voice from the live provider, pass both explicitly,
generate a short review sample, then validate pronunciation, pacing, consent,
and output rights before producing the full asset.

Do not copy token rates, cost calculations, model rankings, hard duration
limits, or deprecation schedules into this file.
