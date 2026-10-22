# Core Planning Rules & Invariants

## Core Invariants

1. **Grounded Decisions**: Never make architecture assumptions from file names alone. Always inspect relevant code and schemas.
2. **KISS**: Design the smallest complete solution that delivers the full requested scope. (Cutting scope beyond the request is opt-in via `--yagni`.)
3. **No Mocks or Placeholders**: Write real implementation steps, real file paths, and verifiable test commands.
4. **File Ownership**: In parallel plans (`--parallel`), every phase MUST declare disjoint file ownership to prevent merge conflicts.
5. **Security & Data Safety**: Never commit secrets, tokens, private keys, or credentials.
