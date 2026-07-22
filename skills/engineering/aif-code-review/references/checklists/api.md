# API overlay (additive to base.md)

**Detection — apply when any hold:** route definitions present (Express, FastAPI, NestJS, Django,
Rails, gin/chi); an OpenAPI/GraphQL schema in the diff; `src/routes|api|controllers/` dirs.

## Pass 1 — blocking (adds to base)
- Public endpoint missing rate limiting (login, register, password-reset).
- API key / token passed in a URL query param (must be a header).
- New route without auth middleware; batch/bulk endpoint without per-item authorization.
- Request body accepted without schema validation (Zod/Joi/Pydantic).
- Mass assignment: whole request body spread into a DB model.
- File upload without size/type limits; array input without a length cap (payload DoS).
- Sensitive fields in responses (password hashes, tokens, internal IDs).
- Stack traces / internal error details in production responses.

## Pass 2 — non-blocking (adds to base)
- List endpoint without pagination (limit/offset or cursor).
- Inconsistent error-response format or naming across endpoints.
- New endpoint without logging/metrics or a correlation/request id.
- Error path that swallows exceptions silently.
- Breaking change to an existing response shape without a version bump / deprecation.
- Changed field type (string → number) in an existing response.
