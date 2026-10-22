# MiniMax Generation

Use the npm-latest Multix invocation from `../SKILL.md`. Resolve available
image, video, speech, music, voice, duration, resolution, language, safety, and
pricing controls from the live MiniMax catalog before each workflow.

## Workflow

1. Inspect the relevant resolved `multix minimax ... --help` command.
2. Verify one model supports the requested modality and controls.
3. Pass the model and other catalog IDs explicitly.
4. Generate a short review asset first.
5. Validate prompt adherence, continuity, pronunciation, rights, and safety.
6. Preserve the accepted prompt and explicit provider configuration.

```bash
<latest-multix> minimax <operation> \
  --model <verified-model-id> \
  <verified-operation-flags>
```

Do not cache a model roster, release status, ranking, hard limit, or price here.
