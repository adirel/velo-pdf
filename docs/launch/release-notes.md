
First public release.

### Viewing
- Opens local PDFs by byte range: large files are never read into memory in one piece.
- Virtualized continuous scroll: only visible pages (±1) exist in the DOM.
- Priority render queue that cancels off-screen work on every scroll; quick previews while flinging.
- pdf.js render slices yield to the event loop, so input is never blocked.
- Instant zoom (mouse wheel, pinch, Ctrl +/-), anchored at the cursor; sharp "detail" rendering at high zoom.
- Documents taller than the browser's maximum element height (e.g. 100,000 pages) scroll correctly.
- Memory budget for rendered pages (384 MB), independent of document size.

### Tools
- Full-text search (Ctrl+F) with streamed results, highlights, and next/previous navigation (Enter, F3).
- Text selection tool (T) alongside the hand tool for drag-to-pan (H).
- Dark reading mode (D).
- Fit width / fit page, go to page.

### App
- Installable PWA, works offline.
- Registers as a PDF handler on Windows ("Open with" → Velo PDF).
- Recent files with resume position; history keeps only file references, never contents.
- Drag and drop anywhere, Ctrl+O to open.

