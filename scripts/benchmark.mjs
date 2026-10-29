// Benchmarks Velo PDF in headless Chrome against a running dev server.
// Usage: npm run dev, then: node scripts/benchmark.mjs <file in test-files/> [runs=3] [searchTerm] [all|first]
// "first" skips waiting for the search to finish (useful for 100,000-page files).
// Generate test files with scripts/make-demo-pdf.mjs. Needs a local Chrome or Edge.
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const [name = "velo-demo-10000.pdf", runsArg = "3", term = "benchmark", searchMode = "all"] = process.argv.slice(2);
const path = resolve("test-files", name);
const url = process.env.VELO_URL ?? "http://localhost:5173/";
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));

const results = [];
for (let run = 0; run < Number(runsArg); run++) {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    protocolTimeout: 3_600_000,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });

  // Open through the plain file input (like picking the file from disk) and count the
  // bytes pdf.js reads from it.
  await page.evaluate(() => {
    delete window.showOpenFilePicker;
    window.__bytesRead = 0;
    const slice = Blob.prototype.slice;
    Blob.prototype.slice = function (start, end, type) {
      const part = slice.call(this, start, end, type);
      if (this instanceof File) window.__bytesRead += part.size;
      return part;
    };
    window.__picked = new Promise((done) =>
      document.getElementById("file-input").addEventListener("change", () => done(performance.now()), { once: true }),
    );
  });
  await (await page.$("#file-input")).uploadFile(path);

  const measured = await page.evaluate(async () => {
    const until = (test) =>
      new Promise((done) => {
        const tick = () => (test() ? done() : requestAnimationFrame(tick));
        tick();
      });
    const canvasOf = (n) => document.querySelector(`.pdf-page[data-page="${n}"] canvas:not(.detail)`);
    const isSharp = (n) => {
      const c = canvasOf(n);
      return !!c && c.width >= c.parentElement.clientWidth * 0.95;
    };

    let t0 = await window.__picked;
    await until(() => canvasOf(1));
    const openFirstPaint = performance.now() - t0;
    await until(() => isSharp(1));
    const openSharp = performance.now() - t0;
    await new Promise((r) => setTimeout(r, 3000));
    const bytesReadAfterOpen = window.__bytesRead;

    const pages = Number(document.getElementById("page-count").textContent.replace(/\D/g, ""));
    const target = Math.floor(pages * 0.9);
    t0 = performance.now();
    const input = document.getElementById("page-input");
    input.value = String(target);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await until(() => canvasOf(target));
    const jumpFirstPaint = performance.now() - t0;
    await until(() => isSharp(target));
    const jumpSharp = performance.now() - t0;

    // Fling: 120 scroll steps of 600px every 8ms, counting main-thread long tasks (>50ms).
    const longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => longTasks.push(e.duration))).observe({
      type: "longtask",
    });
    const scroller = document.getElementById("scroller");
    await new Promise((done) => {
      let n = 0;
      const id = setInterval(() => {
        scroller.scrollTop += 600;
        if (++n === 120) {
          clearInterval(id);
          done();
        }
      }, 8);
    });
    await new Promise((r) => setTimeout(r, 300));
    const flingLongTasks = longTasks.length;

    t0 = performance.now();
    document.getElementById("zoom-in").click();
    const zoomResponse = performance.now() - t0;

    return { pages, openFirstPaint, openSharp, bytesReadAfterOpen, jumpFirstPaint, jumpSharp, flingLongTasks, zoomResponse };
  });

  await page.keyboard.down("Control");
  await page.keyboard.press("f");
  await page.keyboard.up("Control");
  await page.type("#search-input", term);
  const t0 = Date.now();
  await page.waitForFunction(() => /^1 \//.test(document.getElementById("search-count").textContent), {
    timeout: 0,
  });
  // The search starts 200ms after the last keystroke (debounce).
  const searchFirstHit = Date.now() - t0 - 200;
  const search = { searchFirstHit };
  if (searchMode === "all") {
    await page.waitForFunction(() => /\d+ \/ \d+$/.test(document.getElementById("search-count").textContent), {
      timeout: 0,
    });
    search.searchAllPages = Date.now() - t0 - 200;
    search.searchHits = Number((await page.$eval("#search-count", (e) => e.textContent)).split("/")[1]);
  }
  results.push({ size: statSync(path).size, ...measured, ...search });
  await browser.close();
}

const median = (key) => {
  const values = results.map((r) => r[key]).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
};
const summary = Object.fromEntries(Object.keys(results[0]).map((k) => [k, Math.round(median(k))]));
console.log(JSON.stringify({ file: name, runs: results.length, ...summary }, null, 2));
