# Reddit and social posts

Post in one community per day, not all at once. Lead with what you learned; put the links at the end.
Always attach the demo GIF (`docs/demo.gif`) or a short screen recording.

## r/javascript, r/webdev, r/typescript

**Title:** I built a PDF viewer that jumps to page 90,000 of a 100,000-page PDF in under 0.1 s. Here's what made it fast

I wanted a viewer for huge PDFs that never stutters. Five things made the difference:

1. Read local files by byte range (`Blob.slice` + a custom pdf.js range transport) instead of loading them.
2. Virtualize: only visible pages ±1 exist in the DOM.
3. A render queue that is replaced (and cancels in-flight work) on every scroll event.
4. Make pdf.js yield to the event loop between its 15ms render slices (it chains microtasks by default).
5. Zoom by stretching the existing canvas first; re-render sharp only once the gesture settles.

Bonus problem: a 100,000-page PDF is ~85 million px tall, but Chrome caps elements at ~33M px.
Solution: scroll inside a 15M px window that re-bases near its edges.

Repo (MIT): https://github.com/adirel/velo-pdf · Live demo: https://jolly-horse-319b11.netlify.app/

Happy to go deeper on any of these. And if you have a PDF that makes it slow, I want it!

## r/PWA, r/sideproject, r/opensource

**Title:** Velo PDF: an installable, offline PDF viewer for huge files (registers as a Windows PDF app)

Open-source PWA: install it from Edge or Chrome and it shows up in Windows "Open with" for PDFs (File Handling
API). Handles 100,000-page files, full-text search, dark reading mode, recent files that resume where you
left off. Files never leave your device.

https://github.com/adirel/velo-pdf

## X / Twitter thread

1/ I built a PDF viewer that handles a 100,000-page, 335 MB PDF in the browser: jump to page 90,000 in 87 ms, zero jank while scrolling 🚀
Offline, installable, open source. [GIF]
https://github.com/adirel/velo-pdf

2/ Trick #1: no giant arrayBuffer(). A custom pdf.js transport reads byte ranges straight from disk with Blob.slice.

3/ Trick #2: render only what's on screen, and cancel everything else on every scroll event. A fling never builds a backlog.

4/ Trick #3: pdf.js chains its render slices as microtasks, which starves input. One MessageChannel hop between slices = zero jank.

5/ Trick #4: a 100k-page PDF is 85M px tall; Chrome caps elements at 33M. So the viewer scrolls inside a re-basing 15M px window.

6/ Try it: https://jolly-horse-319b11.netlify.app/ ⭐ on GitHub if you like it! #buildinpublic #javascript #pwa

Tag: @pdfjs (if active), @vite_js

## LinkedIn

I just open-sourced Velo PDF: a browser-based PDF viewer built for one thing, speed on huge documents.

• A 10,000-page PDF opens in about a second; jump to any page in under 0.1 s
• Full-text search, dark reading mode, works offline
• Installs like a desktop app and registers as a PDF viewer in Windows
• Files never leave your device

The engineering write-up covers byte-range loading, render cancellation and getting past the browser's
maximum page height. Feedback and ⭐ welcome: https://github.com/adirel/velo-pdf

## Hebrew (Israeli dev groups: Facebook, Telegram, Discord)

בניתי קוד פתוח: Velo PDF, צופה PDF בדפדפן שנבנה למהירות על קבצים ענקיים 🚀

• קובץ של 10,000 עמודים נפתח תוך כשנייה, וקפיצה לכל עמוד לוקחת פחות מעשירית שנייה
• חיפוש בכל הטקסט, מצב קריאה כהה, עובד גם בלי אינטרנט
• מותקן כמו אפליקציה ונרשם ב-Windows כתוכנה לפתיחת PDF
• הקבצים לא יוצאים מהמחשב

אשמח לפידבק ולכוכב ⭐ בגיטהאב: https://github.com/adirel/velo-pdf
דמו: https://jolly-horse-319b11.netlify.app/
