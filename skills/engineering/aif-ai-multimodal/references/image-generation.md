# Image Generation

Use the npm-latest Multix invocation from `../SKILL.md`. This reference owns
workflow, not a provider snapshot.

## Resolve Before Running

1. Run the resolved image-generation command with `--help`.
2. Check the provider's current image-model and pricing documentation.
3. Verify that the selected model supports the requested generation, editing,
   reference-image, size, aspect-ratio, text, and safety controls.
4. Pass the verified model ID explicitly. Never infer a default from this file.

Model IDs, rankings, release status, limits, latency, and prices are live
provider facts. Do not copy them into project documentation or tests.

## Workflow

1. Define subject, composition, style, lighting, palette, and output use.
2. Choose an aspect ratio and resolution supported by the verified model.
3. Generate a small review batch.
4. Check prompt adherence, anatomy, text accuracy, brand consistency, and
   prohibited content.
5. Refine one variable at a time and preserve the accepted prompt/config.
6. Save the final asset plus the explicit provider/model metadata needed to
   reproduce it.

```bash
<latest-multix> gemini generate \
  --prompt "<specific visual brief>" \
  --model <verified-model-id> \
  --aspect-ratio <supported-ratio> \
  --size <supported-size> \
  --output image.png
```

For current capabilities and pricing, use the provider links in
`../SKILL.md`.
