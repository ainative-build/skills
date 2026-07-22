# Web-app overlay (additive to base.md)

**Detection — apply when any hold:** `package.json` has react/vue/svelte/next/nuxt/angular; dirs
`src/pages|app|components|views/`; HTML/JSX/TSX/Vue files in the diff.

## Pass 1 — blocking (adds to base)

### XSS
- `innerHTML` (or `dangerouslySetInnerHTML`) from any non-static source.
- Template literals interpolated into the DOM without escaping.
- URL params rendered without sanitization; `<a href={userInput}>` without protocol check (`javascript:`).
- Server-rendered user content without HTML-entity encoding.

### CSRF
- State-changing endpoint (POST/PUT/DELETE) without CSRF-token verification.
- Cookie-based auth without `SameSite`.

### N+1 (server-rendered views)
- DB queries inside a list-render loop; missing eager loading for rendered associations.

## Pass 2 — non-blocking (adds to base)

### Frontend performance
- Missing `key` on list items; full-lib imports that could be tree-shaken (`lodash` vs `lodash/get`).
- Images without width/height (layout shift); no `loading="lazy"` below the fold.

### Accessibility
- Interactive element without keyboard support (`onClick` without `onKeyDown`).
- Missing `alt`; form input without an associated label; color-only status indicators.
- Custom interactive component missing ARIA attributes.

### Responsive
- Fixed pixel widths that break on mobile; missing viewport meta; overflow clipping content.
