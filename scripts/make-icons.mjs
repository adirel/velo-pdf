// Generates the Velo PDF logo (SVG) and every PNG icon the PWA manifest needs.
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const defs = `
  <defs>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="0.55" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="speed" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.3" cy="0.2" r="0.95">
      <stop offset="0" stop-color="#1f2b63"/>
      <stop offset="0.6" stop-color="#0d1230"/>
      <stop offset="1" stop-color="#070914"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="tile"><rect x="16" y="16" width="480" height="480" rx="112"/></clipPath>
  </defs>`;

// Neon page with a folded corner, text lines and speed streaks: "fast document".
const glyph = `
  <g filter="url(#glow)" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(16 0)">
    <path d="M114 210H178M84 256H178M124 302H178" stroke="url(#speed)" stroke-width="14"/>
    <path d="M226 136H316L366 186V356Q366 376 346 376H226Q206 376 206 356V156Q206 136 226 136Z"
          fill="#22d3ee" fill-opacity="0.08" stroke="url(#neon)" stroke-width="16"/>
    <path d="M316 136V166Q316 186 336 186H366" stroke="url(#neon)" stroke-width="16"/>
    <path d="M240 240H332M240 280H332M240 320H296" stroke="url(#neon)" stroke-width="14"/>
  </g>`;

// Perspective floor grid at the bottom of the tile.
const grid = `
  <g clip-path="url(#tile)" stroke="#22d3ee" stroke-opacity="0.16" stroke-width="2">
    <path d="M16 418H496M16 446H496M16 480H496"/>
    <path d="M256 400L256 496M256 400L120 496M256 400L392 496M256 400L-20 496M256 400L532 496"/>
  </g>`;

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#bg)"/>${grid}
  <rect x="19" y="19" width="474" height="474" rx="109" fill="none" stroke="url(#neon)" stroke-width="6" stroke-opacity="0.9"/>
  ${glyph}
</svg>`;

// Maskable icons are cropped by the OS: full-bleed background, glyph inside the safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">${glyph}</g>
</svg>`;

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

const pub = new URL("../public/", import.meta.url);
writeFileSync(new URL("logo.svg", pub), logo);
writeFileSync(new URL("favicon.png", pub), png(logo, 64));
writeFileSync(new URL("icons/apple-touch-icon.png", pub), png(maskable, 180));
for (const size of [192, 512]) writeFileSync(new URL(`icons/icon-${size}.png`, pub), png(logo, size));
writeFileSync(new URL("icons/maskable-512.png", pub), png(maskable, 512));
writeFileSync(new URL("icons/file-256.png", pub), png(logo, 256));
console.log("logo and icons written");
