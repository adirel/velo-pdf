// Generates a large, realistic-looking PDF (text, headings, charts) for benchmarks and demos.
// Usage: node scripts/make-demo-pdf.mjs [pages=10000] [out=test-files/velo-demo-10000.pdf]
import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";

const pages = Number(process.argv[2] ?? 10000);
const out = process.argv[3] ?? `test-files/velo-demo-${pages}.pdf`;
mkdirSync(dirname(out), { recursive: true });

const WORDS = (
  "render pipeline viewport canvas cache budget latency frame worker thread queue priority cancel " +
  "page layout scroll zoom pixel memory stream range chunk byte document index search text layer " +
  "glyph font vector image decode compress tile region detail preview sharp instant offline install " +
  "storage handle reference history window display device ratio scale anchor velocity prefetch idle " +
  "batch measure benchmark throughput performance system design module interface event handler state"
).split(" ");
const TOPICS = [
  "Rendering Pipeline", "Memory Budget", "Scroll Virtualization", "Range Loading", "Render Scheduling",
  "Zoom and Detail Tiles", "Text Extraction", "Offline Storage", "File Handling", "Performance Metrics",
];

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (list) => list[Math.floor(rnd() * list.length)];
const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);

function sentence() {
  const n = 8 + Math.floor(rnd() * 10);
  const words = Array.from({ length: n }, () => pick(WORDS));
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return `${words.join(" ")}.`;
}

/** Wraps sentences into lines of at most `max` characters. */
function lines(sentences, max) {
  const result = [];
  let line = "";
  for (const word of sentences.join(" ").split(" ")) {
    if ((line + " " + word).trim().length > max) {
      result.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) result.push(line);
  return result;
}

function pageContent(i) {
  const chapter = Math.floor(i / 25) + 1;
  const topic = TOPICS[chapter % TOPICS.length];
  let c = "";
  // Header rule and running title.
  c += "0.13 0.83 0.93 RG 2 w 56 800 m 539 800 l S\n";
  c += `BT /F2 9 Tf 0.35 0.38 0.5 rg 56 808 Td (VELO PDF  -  TECHNICAL MANUAL) Tj ET\n`;
  let y = 760;
  if (i % 25 === 0) {
    c += `BT /F2 26 Tf 0.07 0.08 0.2 rg 56 ${y} Td (Chapter ${chapter}: ${esc(topic)}) Tj ET\n`;
    y -= 40;
  } else {
    c += `BT /F2 15 Tf 0.07 0.08 0.2 rg 56 ${y} Td (${chapter}.${i % 25} ${esc(topic)} in Practice) Tj ET\n`;
    y -= 30;
  }
  const figure = i % 3 === 1;
  const paragraphs = figure ? 3 : 6;
  for (let p = 0; p < paragraphs && y > 120; p++) {
    const text = lines(Array.from({ length: 4 + Math.floor(rnd() * 3) }, sentence), 92);
    c += `BT /F1 10.5 Tf 0.12 0.12 0.16 rg 14 TL 56 ${y} Td\n`;
    for (const line of text) c += `(${esc(line)}) Tj T*\n`;
    c += "ET\n";
    y -= text.length * 14 + 14;
    if (figure && p === 0) {
      // Bar chart with gradient-like colored bars.
      const top = y - 10;
      c += `0.85 0.87 0.95 RG 1 w 70 ${top - 190} m 520 ${top - 190} l S 70 ${top - 190} m 70 ${top} l S\n`;
      const colors = ["0.13 0.83 0.93", "0.55 0.36 0.96", "0.93 0.28 0.6"];
      for (let b = 0; b < 12; b++) {
        const h = 30 + rnd() * 150;
        c += `${colors[b % 3]} rg ${84 + b * 36} ${top - 190} 24 ${h.toFixed(1)} re f\n`;
      }
      c += `BT /F3 9 Tf 0.35 0.38 0.5 rg 70 ${top - 206} Td (Figure ${chapter}.${i % 25}: render latency per batch, ms) Tj ET\n`;
      y = top - 230;
    }
  }
  c += `0.85 0.87 0.95 RG 0.5 w 56 52 m 539 52 l S\n`;
  c += `BT /F1 9 Tf 0.35 0.38 0.5 rg 280 36 Td (${i + 1}) Tj ET\n`;
  return c;
}

const fd = openSync(out, "w");
let pos = 0;
const offsets = [];
const w = (s) => {
  const b = Buffer.from(s, "latin1");
  writeSync(fd, b);
  pos += b.length;
};
const obj = (id, body) => {
  offsets[id] = pos;
  w(`${id} 0 obj\n${body}\nendobj\n`);
};
const pageId = (i) => 6 + i * 2;

w("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
obj(2, `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${pageId(i)} 0 R`).join(" ")}] >>`);
obj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
obj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");
for (let i = 0; i < pages; i++) {
  const c = pageContent(i);
  obj(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageId(i) + 1} 0 R >>`);
  obj(pageId(i) + 1, `<< /Length ${Buffer.byteLength(c, "latin1")} >>\nstream\n${c}endstream`);
}
const total = pageId(pages);
const xref = pos;
let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
for (let id = 1; id < total; id++) x += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
const id = "<56454c4f2d5044462d44454d4f2d3031>";
w(`${x}trailer\n<< /Size ${total} /Root 1 0 R /ID [${id} ${id}] >>\nstartxref\n${xref}\n%%EOF\n`);
closeSync(fd);
console.log(`wrote ${out}: ${pages} pages, ${(pos / 1048576).toFixed(1)} MB`);
