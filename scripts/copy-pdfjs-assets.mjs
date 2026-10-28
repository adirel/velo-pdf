// Copies the runtime assets pdf.js loads lazily (CMaps, standard fonts, WASM decoders)
// into public/ so they are served and precached by the service worker.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = `${root}node_modules/pdfjs-dist/`;
const dest = `${root}public/pdfjs/`;

rmSync(dest, { recursive: true, force: true });
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(src + dir, dest + dir, { recursive: true });
}
console.log("pdf.js assets copied to public/pdfjs");
