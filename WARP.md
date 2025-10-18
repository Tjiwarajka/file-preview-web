# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project type: static client-side web app (no build system, backend, or package manager).

Commands
- Run locally (recommended):
  - Python: `python3 -m http.server 8000` then open http://localhost:8000
  - Node (if installed): `npx serve -l 8000 .` then open http://localhost:8000
- Open directly: double-click `index.html` (works in most browsers, but a local server is more reliable for ES modules and MIME types).
- Build: not applicable (no build step).
- Lint/tests: not configured.

Architecture overview
- Entry HTML: `index.html`
  - Loads styles from `styles.css` and a single ES module `app.js`.
  - UI sections: URL preview form, local file input, a preview panel, and a text-to-PDF area.
  - Pulls jsPDF from a CDN for client-side PDF generation.
- Application logic: `app.js`
  - Core flow centers on `previewBlob(blob, filename)` which detects/infers MIME type and renders an appropriate preview:
    - Images: `<img>`; PDF: `<iframe>`; Video/Audio: media tags with controls; Text/JSON: rendered in `<pre>`.
    - Unknown types fall back to a downloadable link.
  - Object URL lifecycle is managed (revoke on new preview) to avoid leaks.
  - URL preview path: fetches with `mode: 'cors'`, surfaces CORS/network failures with guidance to use local upload.
  - Local preview path: reads selected file directly and passes to `previewBlob`.
  - Text-to-PDF: uses `window.jspdf.jsPDF`, computes line-wrapped content per page, and downloads the PDF.
- Styling: `styles.css`
  - Lightweight CSS using CSS variables and `color-mix`, grid-based layout, and sensible defaults for preview containers.

Notes for future work
- If linting or tests are desired, add them explicitly (e.g., ESLint/Prettier for JS/CSS/HTML; Playwright/Cypress for basic e2e). Until then, there are no repo-native commands for these.
- Remote URL previews depend on the target server’s CORS policy; hosting this on a domain allowed by the source, or using a proxy you control, improves reliability.
