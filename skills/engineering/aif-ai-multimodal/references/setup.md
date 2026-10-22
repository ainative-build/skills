# Setup

Requires Node.js 20+ and provider keys in process env, project `.env`, or
`~/.multix/.env`.

```bash
export GEMINI_API_KEY="your-key"          # https://aistudio.google.com/apikey
export OPENROUTER_API_KEY="your-key"      # optional image/video routing
export MINIMAX_API_KEY="your-key"         # optional MiniMax generation
```

Verify setup:

```bash
npx --yes --prefer-online --package=@mrgoonie/multix@latest -- multix check --verbose
```

When npm networking is enabled, every command resolves npm's `latest` dist-tag
and forces a registry staleness check. Network-restricted sessions must
pre-warm the current release first.

## Backend ownership

- Treat the npm-latest Multix CLI as the runtime contract for covered media
  operations; keep this skill focused on orchestration, provider setup, and
  examples.
- Report missing keys, FFmpeg, provider access, or `multix check` failures as
  environment blockers, not kit-loader failures.
- Track missing capability upstream and refresh the package's latest release
  before retrying. Do not recreate a parallel Python backend unless an
  accepted ADR or explicit maintainer decision changes backend ownership.
- `## Routing` is a routing/guard fix scoped to this skill, not a Multix
  replacement or a new media backend.
