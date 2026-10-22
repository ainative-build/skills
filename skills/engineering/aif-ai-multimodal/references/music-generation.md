# Music Generation

Use the npm-latest Multix invocation from `../SKILL.md`. Provider catalogs
own current music models, duration, lyrics, vocals, streaming, format, rights,
safety, quota, and pricing facts.

## Workflow

1. Define purpose, duration, structure, mood, instrumentation, tempo, vocals,
   and licensing constraints.
2. Inspect the resolved music command with `--help`.
3. Verify a current model supports the required controls.
4. Pass the model explicitly and generate a short review sample.
5. Review structure, artifacts, lyric accuracy, loudness, rights, and safety.
6. Preserve the accepted prompt/configuration with the final asset.

```bash
<latest-multix> minimax generate-music \
  --prompt "<music brief>" \
  --model <verified-model-id> \
  --output music.mp3
```

Never store a recommended model, catalog matrix, release date, duration limit,
or price in this reference.
