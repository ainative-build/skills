## Quick Start

These examples assume `SKILL.md Routing` already ruled out or bypassed native
vision and confirmed a capability-matched credential.

Analyze media:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix gemini analyze \
  --files input.png \
  --prompt "Analyze this content" \
  --format markdown \
  --output analysis.md
```

Transcribe audio or video:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix gemini transcribe \
  --files interview.mp4 \
  --prompt "Generate a transcript with timestamps" \
  --format markdown \
  --output transcript.md
```

Extract structured data:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix gemini extract \
  --files receipt.png \
  --prompt "Extract merchant, date, total, and line items as JSON" \
  --format json \
  --output receipt.json
```

Convert documents to Markdown:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix doc convert \
  --input report.pdf \
  --output report.md
```

Generate images after resolving an available model from the live provider catalog:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix gemini generate \
  --prompt "Studio product photo on white background" \
  --model <verified-model-id> \
  --aspect-ratio 1:1 \
  --size 2K \
  --output product.png
```

Generate images through OpenRouter:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix openrouter generate \
  --prompt "Editorial campaign key visual" \
  --model <provider-qualified-model-id> \
  --aspect-ratio 4:5 \
  --image-size 2K \
  --output campaign.png
```

Configure OpenRouter fallback models with:

```bash
export OPENROUTER_FALLBACK_MODELS="black-forest-labs/flux.2-flex,recraft-ai/recraft-v3"
```

Generate videos with a currently available provider model:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix gemini generate-video \
  --prompt "15-second product demo video" \
  --model <verified-model-id> \
  --resolution 1080p \
  --aspect-ratio 16:9 \
  --output demo.mp4
```

Generate with MiniMax:

```bash
# Image
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix minimax generate \
  --prompt "A cyberpunk city" --model <verified-image-model> --aspect-ratio 16:9 --output city.png

# Video
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix minimax generate-video \
  --prompt "A dancer" --model <verified-video-model> --duration <supported-seconds> --resolution <supported-resolution> --output dancer.mp4

# Speech
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix minimax generate-speech \
  --text "Hello world" --model <verified-speech-model> --voice <verified-voice> --output hello.mp3

# Music
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix minimax generate-music \
  --lyrics "La la la\nOh yeah" --prompt "upbeat pop" --model <verified-music-model> --output song.mp3
```

Optimize media before provider uploads:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix media optimize \
  --input raw-video.mp4 \
  --output optimized-video.mp4 \
  --target-size 20
```
