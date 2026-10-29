# Contributing to Velo PDF

Thanks for helping make Velo PDF faster! Bug reports, ideas and pull requests are all welcome.

## Quick start

```bash
git clone https://github.com/adirel/velo-pdf.git
cd velo-pdf
npm install
npm run dev          # http://localhost:5173
```

Need a big test file? Generate one (they go to `test-files/`, which is git-ignored):

```bash
npm run demo-pdf -- 10000     # 10,000 pages, ~33 MB
npm run demo-pdf -- 100000    # 100,000 pages, ~335 MB
```

## Before you open a pull request

1. `npm run build` passes (type-check + production build). CI runs the same command.
2. For anything touching rendering, scrolling, zoom or loading, run the benchmark before and after
   your change and paste both results in the PR:

   ```bash
   npm run dev                                   # in one terminal
   npm run benchmark -- velo-demo-10000.pdf 3    # in another
   ```

3. Keep the main thread free: no work that can block for more than ~15ms while the user scrolls.

## Where things live

| Area | File |
|---|---|
| Opening files, byte-range reads | `src/pdf/openPdf.ts` |
| Virtualized view, zoom, scroll window | `src/viewer/PdfViewer.ts` |
| Render scheduling and cancellation | `src/viewer/RenderQueue.ts` |
| Rendered-page memory budget | `src/viewer/CanvasCache.ts` |
| Page positions | `src/viewer/PageLayout.ts` |
| Text selection layer and search highlights | `src/viewer/PageTextLayer.ts` |
| Full-text search | `src/search/PdfSearch.ts` |
| Recent files (IndexedDB) | `src/recentFiles.ts` |
| UI wiring, keyboard and mouse | `src/main.ts` |

## Good first issues

Look for the [`good first issue`](https://github.com/adirel/velo-pdf/labels/good%20first%20issue) label.
If you want to take one, comment on it so nobody duplicates the work.

## Style

- TypeScript, no framework, no runtime dependencies besides pdf.js.
- Match the surrounding code: small focused modules, comments that explain *why*.
- Commit messages: short imperative summary line ("Add thumbnails sidebar"), details in the body.

## Reporting bugs

Please include your browser and OS, the PDF's size and page count (attach it if you can share it),
and the steps to reproduce. Performance issues: a screenshot of the DevTools Performance panel helps a lot.
