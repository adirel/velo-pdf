---
title: "How I built a browser PDF viewer that opens 100,000-page files instantly"
tags: javascript, webdev, performance, pdf
cover_image: https://raw.githubusercontent.com/adirel/velo-pdf/main/docs/social-preview.png
---

Most PDF viewers are fine until you open *the* PDF: a 3,000-page datasheet, a scanned legal bundle,
a 10,000-page manual. Then scrolling stutters, zoom lags, and the tab eats a gigabyte of RAM.

I wanted a viewer where file size simply doesn't matter, so I built **[Velo PDF](https://github.com/adirel/velo-pdf)**:
an open-source, installable PWA on top of pdf.js. On my laptop it shows the first page of a
10,000-page PDF in about a second, jumps to page 9,000 in 85 ms, and jumps to page 90,000 of a 100,000-page, 335 MB file in 87 ms. Here are the five ideas that got it there.

![Velo PDF demo](https://raw.githubusercontent.com/adirel/velo-pdf/main/docs/demo.gif)

## 1. Don't load the file. Read byte ranges.

pdf.js can fetch PDFs over HTTP with range requests, but for a *local* file the usual approach is
`file.arrayBuffer()`: read everything, then parse. For a 2 GB file that's seconds of waiting and 2 GB of memory.

pdf.js has an escape hatch: `PDFDataRangeTransport`. You tell it the file length and it asks *you* for byte
ranges as it needs them. A `File` is a `Blob`, and `Blob.slice()` is lazy, so serving those requests from disk
takes ten lines:

```ts
class BlobRangeTransport extends PDFDataRangeTransport {
  constructor(private blob: Blob, initial: Uint8Array) {
    super(blob.size, initial);
  }
  override requestDataRange(begin: number, end: number) {
    this.blob.slice(begin, end).arrayBuffer()
      .then((buf) => this.onDataRange(begin, new Uint8Array(buf)));
  }
}

getDocument({ range: new BlobRangeTransport(file, head), disableAutoFetch: true, disableStream: true });
```

With `disableAutoFetch`, pdf.js is supposed to fetch only what it needs. Honest caveat: with my generated
(non-linearized) test files, pdf.js still ends up reading the whole file during open, so open time grows with
size (about 1 s for 35 MB, 5 s for 335 MB). Everything *after* open is independent of size. That's the next
thing I'm digging into, so if you know pdf.js internals, I'd love a pointer.

## 2. Render only what's visible, and cancel everything else

The DOM holds the visible pages plus one on each side; every other page is just a number in a
`Float64Array` of positions, so a binary search finds which pages are on screen.

Rendering goes through a priority queue: pages closest to the viewport center first, then two pages ahead
in the scroll direction. The key detail: on **every** scroll frame the queue is *replaced*, and in-flight
renders for pages that are no longer wanted are cancelled (`renderTask.cancel()`). Fling through 5,000 pages
and you don't leave 5,000 renders queued behind you.

While you're scrolling fast, only quarter-resolution previews render (cheap, and pdf.js caches the parsed
operator list, so the sharp render later doesn't re-parse the page).

## 3. Never block input for more than one frame

pdf.js renders a page in ~15ms slices. By default it chains those slices with `Promise.resolve().then(...)`,
which is a *microtask*: the browser can't process input between them, so a heavy page blocks scrolling until
it's done.

`RenderTask` has an `onContinue` hook. Route it through a macrotask and input gets a turn between slices:

```ts
const channel = new MessageChannel();
const queue: (() => void)[] = [];
channel.port1.onmessage = () => queue.shift()?.();

task.onContinue = (cont) => { queue.push(cont); channel.port2.postMessage(null); };
```

In the benchmark, a 120-step fling across the 10,000-page document produced **0 long tasks**
on the main thread.

## 4. Zoom instantly, then sharpen

Re-rendering on every wheel tick is hopeless. Instead, zooming just changes the page boxes' CSS size:
the existing canvas stretches on the GPU (blurry for a moment, but instant: 22 ms to respond).
Once the gesture settles (140ms), sharp renders replace the stretched ones.

At high zoom a whole page would need a 100+ megapixel canvas, which browsers refuse. So above ~16 Mpx the
page keeps a capped full-page render, and a second **detail canvas** renders only the visible region
(plus a margin) at full resolution, positioned in page percentages so it stays aligned while you keep zooming.

## 5. When the document is taller than the browser allows

This one surprised me. At 100% zoom a 100,000-page A4 document is ~85 million pixels tall. Chrome caps
element height at ~33.5M px (Firefox at ~17.9M), and scroll positions silently clamp: zooming into page
9,000 of a 10,000-page file landed me on page 4,973.

The fix: when the document is taller than 15M px, the scroll container only represents a 15M px *window*
of it. A `base` offset maps window coordinates to document coordinates, pages are positioned at
`top - base`, and when the viewport gets within 1.5M px of the window's edge the window re-bases around the
current position (one `scrollTop` assignment plus repositioning ~3 page elements, in the same frame).

## The rest

- Memory: rendered canvases live in an LRU with a **byte** budget (384 MB), not a page count, so memory is
  flat regardless of document size. Evicted pages also get `page.cleanup()`.
- Search streams results page by page: the first hit in the 10,000-page document showed up in 36 ms;
  all 46,658 matches in 10.6 s.
- It's a PWA: Workbox precaches everything, and the manifest's `file_handlers` makes the installed app a
  Windows "Open with" target for PDFs.

## Numbers

| | 10,000 pages · 33.5 MB | 100,000 pages · 335 MB |
|---|---|---|
| Open → first page sharp | 1.0 s | 5.3 s |
| Jump to page at 90% → sharp | 85 ms | 87 ms |
| Long tasks during a fast fling | 0 | 0 |
| Zoom response | 22 ms | 14 ms |
| Search: first hit | 36 ms | 15 ms |

Measured with `scripts/benchmark.mjs` (headless Chrome, 1440×900) on an Intel Core Ultra 7 155H laptop.
The test PDFs are generated by `scripts/make-demo-pdf.mjs`, so you can reproduce them.

## Try it

- Live: https://jolly-horse-319b11.netlify.app/
- Code (MIT): https://github.com/adirel/velo-pdf

Next up: thumbnails, outline, and moving rendering into a Worker with `OffscreenCanvas`.
If you have a PDF that makes it slow, please open an issue. I want it!
