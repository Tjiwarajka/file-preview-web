# File Previewer & Text-to-PDF

A minimal client-side website to:
- Preview files from a URL or a local upload
- Convert pasted/typed text into a downloadable PDF

## Features
- Images, PDFs, text, audio, and video previews where supported by the browser
- Fallback to a direct download link if preview is not supported
- URL fetch with CORS error handling guidance
- Client-side PDF generation using jsPDF (via CDN)

## Usage
1. Open `index.html` in your browser (double-click or serve via any static server).
2. To preview from URL, paste a direct file link and click "Preview URL".
   - If blocked by CORS, download the file and use local upload instead.
3. To preview a local file, choose a file using the file input.
4. To export text as PDF, paste text into the textarea and click "Download PDF".

## Notes
- No build step is required; this is a static site.
- For best results with remote URLs, host this on a domain that the remote server allows via CORS, or use a proxy you control.

## License
MIT
