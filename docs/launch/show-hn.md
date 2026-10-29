# Show HN

**When:** Tuesday to Thursday, 8–10am US Eastern (15:00–17:00 Israel). Stay online for the next 3–4 hours
and answer every comment; the first hour decides whether it reaches the front page.

**Link:** https://github.com/adirel/velo-pdf (HN readers like the repo; the live demo is linked at the top)

## Title (pick one, max 80 characters)

1. `Show HN: Velo PDF – a browser PDF viewer that handles 100k-page files`
2. `Show HN: I built a PDF viewer that jumps to page 90,000 in under 0.1s`
3. `Show HN: Velo PDF – offline, installable PDF viewer for huge files (pdf.js)`

## First comment (post right after submitting)

Hi HN! I kept running into PDFs (datasheets, legal bundles, scanned archives) that make browser
viewers crawl, so I built a viewer focused purely on latency for huge files.

Live demo: https://jolly-horse-319b11.netlify.app/ (installable PWA, works offline, files never leave your machine)

What it does differently:

- **Byte-range loading.** Local files are read through a custom pdf.js range transport (`Blob.slice`) instead of
  one giant `arrayBuffer()`. (Honest caveat: for my non-linearized test files pdf.js still reads the whole
  file during open, so open time grows with size: ~1 s for 35 MB, ~5 s for 335 MB. Investigating; ideas welcome.)
- **Only renders what you see.** Virtualized DOM (visible pages ±1), and a priority render queue that cancels
  off-screen work on every scroll event, so a fast fling never leaves a backlog.
- **Never blocks input.** pdf.js renders in ~15ms slices; by default it chains them as microtasks, which
  starves input. Hopping through a macrotask between slices keeps scroll and clicks responsive.
- **Instant zoom.** The existing canvas is stretched by CSS immediately, and a sharp render replaces it when
  you stop. Past ~16 Mpx a page can't be one canvas, so a "detail" canvas renders just the visible region.
- **Documents taller than the browser allows.** Chrome caps element height at ~33M px; a 100,000-page PDF is
  ~85M px. The viewer scrolls inside a 15M px window that re-bases as you approach its edges.

Numbers on my laptop (Core Ultra 7 155H, Chrome, headless benchmark in the repo):
10,000 pages: first page sharp in 1.0 s, jump to page 9,000 in 85 ms, zoom response 22 ms, 0 long tasks during a fast fling.
100,000 pages / 335 MB: jump to page 90,000 in 87 ms, 0 long tasks. Details in the README.

Stack: TypeScript, pdf.js, Vite, Workbox. No framework, MIT licensed.

Next on the list: thumbnails, outline, and rendering inside a Worker with OffscreenCanvas.
I'd love feedback, especially PDFs that make it slow!

## Likely questions (have answers ready)

- *Why not the browser's built-in viewer?* It's great for normal files; on huge ones it loads/parses more
  up front and doesn't let you control memory. Velo has a fixed memory budget for rendered pages (384 MB).
- *Does it upload my files?* No. Everything runs locally; the history stores only a file handle reference.
- *Firefox/Safari?* Viewing works in modern browsers; installing and "Open with" from Windows need
  Chromium (Edge/Chrome) because of the File Handling API.
- *Why not PDFium/MuPDF in WASM?* Rendering sits behind one module, so swapping engines is possible; pdf.js
  was the fastest way to a robust v1.
