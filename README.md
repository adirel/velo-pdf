<div align="center">

<a href="https://jolly-horse-319b11.netlify.app/">
  <img src="public/icons/icon-512.png" alt="Velo PDF logo" width="140" height="140" />
</a>

# Velo PDF

**Instant viewing for massive PDFs. Local, offline, zero lag.**

A blazing-fast, installable PDF viewer (PWA) built for huge documents: 10,000 pages and gigabyte files
open instantly, scroll at 60 fps and zoom without delay. Files never leave your device.

[![Live demo](https://img.shields.io/badge/%F0%9F%9A%80_Live_demo-jolly--horse--319b11.netlify.app-22d3ee?style=for-the-badge)](https://jolly-horse-319b11.netlify.app/)

[![Build](https://img.shields.io/github/actions/workflow/status/adirel/velo-pdf/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=build)](https://github.com/adirel/velo-pdf/actions/workflows/ci.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fjolly-horse-319b11.netlify.app&style=flat-square&logo=netlify&logoColor=white&label=netlify&up_message=online&down_message=offline)](https://jolly-horse-319b11.netlify.app/)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#-install-as-an-app)
[![Offline](https://img.shields.io/badge/offline-ready-8b5cf6?style=flat-square)](#-features)
[![Privacy](https://img.shields.io/badge/privacy-100%25_local-ec4899?style=flat-square)](#-features)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-22c55e?style=flat-square)](https://github.com/adirel/velo-pdf/pulls)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![PDF.js](https://img.shields.io/badge/PDF.js-mozilla-E66000?style=flat-square&logo=mozilla&logoColor=white)](https://mozilla.github.io/pdf.js/)
[![Workbox](https://img.shields.io/badge/Workbox-service_worker-FF6F00?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/workbox)
[![Netlify](https://img.shields.io/badge/Netlify-hosted-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://jolly-horse-319b11.netlify.app/)
[![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](#-install-as-an-app)
[![Edge](https://img.shields.io/badge/Edge-supported-0078D7?style=flat-square)](#-install-as-an-app)
[![Windows](https://img.shields.io/badge/Windows-.pdf_handler-0078D6?style=flat-square&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yIDNoOS41djkuNUgyek0xMi41IDNIMjJ2OS41aC05LjV6TTIgMTMuNWg5LjVWMjNIMnpNMTIuNSAxMy41SDIyVjIzaC05LjV6Ii8+PC9zdmc+)](#-open-pdfs-from-windows)

[![Last commit](https://img.shields.io/github/last-commit/adirel/velo-pdf?style=flat-square)](https://github.com/adirel/velo-pdf/commits/main)
[![Top language](https://img.shields.io/github/languages/top/adirel/velo-pdf?style=flat-square)](https://github.com/adirel/velo-pdf)
[![Repo size](https://img.shields.io/github/repo-size/adirel/velo-pdf?style=flat-square)](https://github.com/adirel/velo-pdf)
[![Stars](https://img.shields.io/github/stars/adirel/velo-pdf?style=flat-square&logo=github)](https://github.com/adirel/velo-pdf/stargazers)

**[Open the app](https://jolly-horse-319b11.netlify.app/)** ·
**[Report a bug](https://github.com/adirel/velo-pdf/issues/new)** ·
**[Request a feature](https://github.com/adirel/velo-pdf/issues/new)**

<br />

<img src="docs/screenshots/home.png" alt="Velo PDF home screen" width="900" />

</div>

## 📸 Screenshots

| Viewer | Menu & recent files |
|---|---|
| <img src="docs/screenshots/viewer.png" alt="Viewing page 137 of a 5,000-page PDF" /> | <img src="docs/screenshots/sidebar.png" alt="Sidebar with recent files" /> |

## ✨ Features

- ⚡ **Zero-lag scrolling** through 10,000+ pages: only what's on screen is rendered.
- 🗂️ **Gigabyte files**: read from disk by byte range, never loaded fully into RAM.
- 🔍 **Instant zoom** with the mouse wheel or pinch, anchored at the cursor; razor-sharp at any zoom level.
- ✋ **Drag to pan** with the left mouse button, with a smooth glide on release.
- 🕘 **Recent files** with "continue reading": reopens each file at the page you left off.
- 📲 **Installable PWA** that works fully **offline**.
- 🪟 **Registers as a PDF viewer on Windows**: *Open with → Velo PDF*.
- 🔒 **Private by design**: nothing is uploaded; history stores only a reference to each file.
- 🌌 Futuristic neon UI that works on desktop and mobile.

## 🚀 Live demo

👉 **https://jolly-horse-319b11.netlify.app/**

Every push to `main` is deployed automatically by Netlify.

## 📲 Install as an app

1. Open the [live demo](https://jolly-horse-319b11.netlify.app/) in **Edge** or **Chrome**.
2. Click **Install app** in the top bar (or the install icon in the address bar).
3. Velo PDF now has its own window, Start-menu entry and works offline.

## 🪟 Open PDFs from Windows

After installing:

1. Right-click any PDF → **Open with** → **Velo PDF**. The first time, the browser asks to allow it.
2. To make it the default: *Settings → Apps → Default apps → .pdf* → **Velo PDF**.

File handling comes from `file_handlers` in the manifest ([`vite.config.ts`](vite.config.ts)) and
`window.launchQueue` in [`src/main.ts`](src/main.ts).

## ⌨️ Controls

| Action | Input |
|---|---|
| Zoom in / out | Mouse wheel, touchpad pinch, `Ctrl` `+` / `Ctrl` `-` |
| Fit page | `Ctrl` `0` |
| Pan | Drag with the left mouse button |
| Scroll | Scrollbars, `PageUp` / `PageDown`, arrows, `Home` / `End` |
| Open a file | `Ctrl` `O`, the menu, or drop a PDF anywhere |
| Go to page | Type a number in the page box and press `Enter` |

## 🛠️ Development

```bash
git clone https://github.com/adirel/velo-pdf.git
cd velo-pdf
npm install
npm run dev             # http://localhost:5173
npm run build           # production build in dist/ (with service worker)
npm run build:preview   # build + serve on http://localhost:4173 (installable)
npm run icons           # regenerate the logo and app icons
```

The dev server doesn't run the service worker; use `build:preview` (or the deployed site) to test installing.

### Deploy on Netlify

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 22 |

## 🧠 How it stays fast

| Technique | Where |
|---|---|
| Large files are read from disk by byte range (`Blob.slice`), never fully loaded into RAM! | [`openPdf.ts`](src/pdf/openPdf.ts) |
| Virtualized DOM: only the visible pages ±1 exist | [`PdfViewer.ts`](src/viewer/PdfViewer.ts) `#update` |
| Page sizes are guessed from page 1, then fixed in idle batches with scroll anchoring | [`PageLayout.ts`](src/viewer/PageLayout.ts), `#loadAllSizes` |
| Priority render queue that cancels off-screen work on every scroll | [`RenderQueue.ts`](src/viewer/RenderQueue.ts) |
| pdf.js render slices yield to the event loop, so input is never blocked for more than ~15ms | `yieldToEventLoop` |
| Quick low-res preview first, then a sharp render once scrolling/zooming settles | `#wantedRenders` |
| Zoom is instant: existing canvases are stretched by CSS, then re-rendered | `setScale` |
| At high zoom, a sharp "detail" canvas covers only the visible region | `#detailRequest` |
| LRU cache of rendered canvases with a byte budget (384MB), and evicted pages are cleaned up | [`CanvasCache.ts`](src/viewer/CanvasCache.ts) |

## 🗺️ Roadmap

- [ ] Text selection, copy and full-text search
- [ ] Thumbnails sidebar and outline / bookmarks
- [ ] Rendering inside a Worker with `OffscreenCanvas`
- [x] Recent files with resume position
- [x] Installable PWA with Windows file handling

## 🤝 Contributing

Issues and pull requests are welcome. Please run `npm run build` before opening a PR; CI runs the same check.

---

<div align="center">

Made with ⚡ and ☕ · <a href="https://jolly-horse-319b11.netlify.app/">jolly-horse-319b11.netlify.app</a>

<sub>Keywords: pdf viewer, pdf reader, pwa, progressive web app, pdf.js, large pdf, fast pdf viewer, offline pdf viewer, typescript, vite, netlify, windows pdf viewer, file handling api</sub>

</div>
