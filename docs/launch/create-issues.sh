#!/usr/bin/env bash
# Creates the labels and starter issues on GitHub. Requires GitHub CLI signed in with
# write access to adirel/velo-pdf (gh auth login).
set -euo pipefail
REPO=adirel/velo-pdf

gh label create "good first issue" --repo "$REPO" --color 7057ff --description "Good for newcomers" --force
gh label create "help wanted" --repo "$REPO" --color 008672 --description "Extra attention is needed" --force
gh label create performance --repo "$REPO" --color 22d3ee --description "Speed and memory" --force

issue() {
  gh issue create --repo "$REPO" --title "$1" --label "$2" --body "$3"
}

issue "Thumbnails sidebar" "good first issue,enhancement" \
"A collapsible panel with page thumbnails. Thumbnails should render through the existing \`RenderQueue\` at a low scale and only for thumbnails in view (virtualized like the main view). Clicking a thumbnail calls \`viewer.goToPage()\`."

issue "Outline / bookmarks panel" "good first issue,enhancement" \
"Show the PDF outline (\`doc.getOutline()\`) as a tree in the sidebar and navigate on click (\`doc.getDestination()\` + \`doc.getPageIndex()\`)."

issue "Clickable links in documents" "good first issue,enhancement" \
"Render link annotations (\`page.getAnnotations()\`) as transparent \`<a>\` elements over the page, for internal destinations and external URLs. Only for slots that exist (visible pages)."

issue "Rotate pages" "good first issue,enhancement" \
"Add rotate left/right (90°) buttons. \`page.getViewport({ rotation })\` handles rendering; \`PageLayout\` needs to swap width/height for rotated pages."

issue "Keyboard shortcuts help dialog" "good first issue,enhancement" \
"A \`?\` shortcut that opens a small dialog listing all keyboard shortcuts."

issue "Remember zoom per file" "good first issue,enhancement" \
"Store the zoom level in the recent-files entry (\`src/recentFiles.ts\`, like \`page\`) and restore it on reopen."

issue "Two-page (book) layout" "good first issue,enhancement" \
"A view mode with pages side by side. \`PageLayout.compute()\` is the place to start."

issue "Print support" "enhancement" \
"Print the current document (render pages at print resolution into a hidden iframe)."

issue "Opening reads the whole file for large non-linearized PDFs" "performance,help wanted" "With the files from \`npm run demo-pdf\`, pdf.js requests every byte range during \`getDocument()\` even with \`disableAutoFetch: true\` (35 MB: ~1 s, 335 MB: ~5 s to open). requestAllChunks() is not called and there are no XRef warnings. Find out which part of document loading touches every object, and whether real-world PDFs behave the same. Repro: \`npm run benchmark -- velo-demo-100000.pdf 1 benchmark first\` and look at bytesReadAfterOpen."

issue "Full-text search memory on 100,000-page documents" "performance,help wanted" "Searching every page of a 100,000-page document takes minutes and several GB of memory (page text cache + pdf.js page proxies). Ideas: cap the text cache, call page.cleanup() after extracting text, or search in a dedicated worker."

issue "Render pages in a Worker with OffscreenCanvas" "enhancement,performance,help wanted" \
"Move pdf.js rendering off the main thread entirely, keeping the current priority/cancellation behaviour of \`RenderQueue\`."
