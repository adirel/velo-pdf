# Starter issues

Open these on GitHub before launch so visitors can find a place to contribute.
Run `create-issues.sh` (next to this file) once GitHub CLI is signed in to the `adirel` account,
or paste them by hand. Labels: `good first issue` + `enhancement` unless noted.

---

## 1. Thumbnails sidebar

A collapsible panel with page thumbnails. Thumbnails should render through the existing
`RenderQueue` at a low scale and only for thumbnails in view (virtualized like the main view).
Clicking a thumbnail calls `viewer.goToPage()`.

## 2. Outline / bookmarks panel

Show the PDF outline (`doc.getOutline()`) as a tree in the sidebar and navigate on click
(`doc.getDestination()` + `doc.getPageIndex()`).

## 3. Clickable links

Render link annotations (`page.getAnnotations()`) as transparent `<a>` elements over the page,
for internal destinations and external URLs. Only for slots that exist (visible pages).

## 4. Rotate pages

Add rotate left/right (90°) buttons. `page.getViewport({ rotation })` handles rendering;
`PageLayout` needs to swap width/height for rotated pages.

## 5. Keyboard shortcuts help

A `?` shortcut that opens a small dialog listing all keyboard shortcuts.

## 6. Remember zoom per file

Store the zoom level in the recent-files entry (`src/recentFiles.ts`, like `page`) and restore it on reopen.

## 7. Two-page (book) layout

A view mode with pages side by side. `PageLayout.compute()` is the place to start.

## 8. Print

Print the current document (render pages at print resolution into a hidden iframe).
Label: `enhancement` (not a first issue: larger).

## 9. Opening reads the whole file for large non-linearized PDFs

pdf.js requests every byte range during `getDocument()` for the generated test files, so open time grows with
size. Find out why. Labels: `performance`, `help wanted`.

## 10. Full-text search memory on 100,000-page documents

Searching every page of a 100,000-page document takes minutes and several GB. Labels: `performance`, `help wanted`.

## 11. Render pages inside a Worker with OffscreenCanvas

Move pdf.js rendering off the main thread entirely. Label: `enhancement`, `performance`, `help wanted`.
