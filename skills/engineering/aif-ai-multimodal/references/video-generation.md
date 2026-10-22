# Video Generation

Use the npm-latest Multix invocation from `../SKILL.md`. Resolve current
provider model IDs, generation modes, duration, resolution, aspect ratio,
reference-frame, audio, extension, safety, latency, and pricing facts live.

## Workflow

1. Write a shot brief: subject, action, setting, camera, lighting, timing, and
   audio intent.
2. Inspect the resolved video-generation command with `--help`.
3. Verify the requested controls against one currently available model.
4. Pass the verified model and supported values explicitly.
5. Generate a short review asset and inspect continuity, motion, artifacts,
   prompt adherence, audio, and policy compliance.
6. Preserve the accepted prompt/config and disclose generated media as required.

```bash
<latest-multix> gemini generate-video \
  --prompt "<shot brief>" \
  --model <verified-model-id> \
  --resolution <supported-resolution> \
  --aspect-ratio <supported-ratio> \
  --output video.mp4
```

Never cache a "latest" or "production" model, capability matrix, release date,
price estimate, or hard provider limit here.
