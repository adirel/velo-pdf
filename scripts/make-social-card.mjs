// Renders scripts/social-card.html to docs/social-preview.png (GitHub/X/LinkedIn link preview).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const chrome = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--allow-file-access-from-files"],
  defaultViewport: { width: 1280, height: 640, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(pathToFileURL(`${root}scripts/social-card.html`).href, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}docs/social-preview.png` });
await browser.close();
console.log("wrote docs/social-preview.png");
