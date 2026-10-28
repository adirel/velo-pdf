# Velo PDF

Web/PWA PDF viewer built for very large local files, with minimal scroll and zoom latency.
Once installed, Windows lists it as a handler for `.pdf` files.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (with service worker)
npm run preview    # serve the production build
npm run build:preview   # build + serve on http://localhost:4173 (installable, service worker active)
```

The dev server doesn't run the service worker; use `build:preview` (or a deployed build) to install.
An **Install** button appears in the toolbar whenever the browser offers installation.

## Register as a PDF viewer on Windows

1. Open the app (a production build served over HTTPS, or `localhost`) in Edge or Chrome.
2. Install it: the install icon in the address bar, or menu → *Apps → Install*.
3. Right-click any PDF → *Open with* → **PDF Viewer**. The first time, the browser asks
   whether to allow the app to open PDF files.
4. To make it the default: *Settings → Apps → Default apps → .pdf* → **PDF Viewer**.

File handling comes from `file_handlers` in the manifest (`vite.config.ts`) and
`window.launchQueue` in `src/main.ts`. It works only in the installed app.
The service worker precaches everything, so the installed app works offline.

## How it stays fast

| Technique | Where |
|---|---|
| Large files are read from disk by byte range (`Blob.slice`), never fully loaded into RAM | `src/pdf/openPdf.ts` |
| Virtualized DOM: only the visible pages ±1 exist | `PdfViewer.#update` |
| Page sizes are guessed from page 1, then fixed in idle batches with scroll anchoring | `PageLayout`, `#loadAllSizes` |
| Priority render queue that cancels off-screen work on every scroll | `RenderQueue` |
| pdf.js render slices yield to the event loop, so input is never blocked for more than ~15ms | `yieldToEventLoop` |
| Quick low-res preview first, then a sharp render once scrolling/zooming settles | `#wantedRenders` |
| Zoom is instant: existing canvases are stretched by CSS, then re-rendered | `setScale` |
| At high zoom, a sharp "detail" canvas covers only the visible region | `#detailRequest` |
| LRU cache of rendered canvases with a byte budget (384MB), and evicted pages are cleaned up | `CanvasCache` |

## Not yet implemented

- Text layer (selection/copy) and search
- Thumbnails sidebar and outline/bookmarks

- Rendering inside a Worker with `OffscreenCanvas`
