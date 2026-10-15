/**
 * Generates placeholder "aerial" imagery for the demo seed: 4 site layouts x
 * 5 construction stages x 3 orientation variants, written to
 * public/uploads/demo/. Replace these with real before/after screenshots
 * (Google Earth historical imagery / Esri Wayback) for a more convincing demo.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { SiteLayout } from "./seed-data/projects";

export const DEMO_IMAGERY_DIR = path.join(process.cwd(), "public", "uploads", "demo");
export const STAGES = [0, 1, 2, 3, 4] as const; // bare → cleared → foundation → structure → complete
export const VARIANTS = 3;

const W = 1200;
const H = 800;

export function demoImagePath(layout: SiteLayout, stage: number, variant: number) {
  return `/uploads/demo/${layout}-s${stage}-v${variant}.jpg`;
}

/** Map a progress percentage to a visual construction stage. */
export function stageForProgress(p: number) {
  if (p <= 0) return 0;
  if (p < 25) return 1;
  if (p < 55) return 2;
  if (p < 95) return 3;
  return 4;
}

// Shared surroundings: terrain texture, an existing road, neighbouring roofs, trees.
function surroundings() {
  const trees = [
    [120, 140], [160, 180], [90, 600], [140, 650], [1050, 120], [1100, 170],
    [1080, 640], [1020, 700], [300, 720], [960, 380], [1000, 420],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#4d6b3a" opacity="0.9"/><circle cx="${x + 18}" cy="${y + 10}" r="18" fill="#5c7d44"/>`)
    .join("");
  const roofs = [
    [40, 260, 110, 80], [40, 360, 90, 70], [40, 450, 120, 90],
    [1030, 250, 120, 90], [1040, 470, 110, 80],
  ]
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b9b2a6" stroke="#8d867b" stroke-width="3"/>`)
    .join("");
  return `
    <defs>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 0.18"/></feComponentTransfer>
        <feBlend in="SourceGraphic" mode="multiply"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="#c8b48c"/>
    <rect x="0" y="40" width="${W}" height="60" fill="#6f6f6f"/>
    <line x1="0" y1="70" x2="${W}" y2="70" stroke="#e8e8e8" stroke-width="3" stroke-dasharray="30 24"/>
    ${roofs}${trees}`;
}

const SITE = { x: 330, y: 190, w: 560, h: 470 };

function shrubs() {
  const pts = [[400, 260], [520, 330], [700, 250], [800, 420], [450, 520], [640, 560], [760, 600], [580, 420]];
  return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="#7a8a52" opacity="0.8"/>`).join("");
}

function building(stage: number) {
  const { x, y, w, h } = SITE;
  const parts: string[] = [];
  if (stage === 0) return shrubs();
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d8c6a0"/>`);
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3b6ea5" stroke-width="4" stroke-dasharray="14 8"/>`);
  if (stage === 1) {
    parts.push(`<rect x="${x + 40}" y="${y + 380}" width="40" height="22" fill="#e0b000"/><rect x="${x + 100}" y="${y + 400}" width="34" height="20" fill="#e0b000"/>`);
    return parts.join("");
  }
  // excavation / footprint
  parts.push(`<rect x="${x + 80}" y="${y + 70}" width="400" height="280" fill="#9a7d58"/>`);
  if (stage === 2) {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++)
      parts.push(`<rect x="${x + 110 + i * 64}" y="${y + 100 + j * 70}" width="14" height="14" fill="#8c8c8c"/>`);
    parts.push(`<rect x="${x + 20}" y="${y + 400}" width="40" height="22" fill="#e0b000"/>`);
    return parts.join("");
  }
  if (stage === 3) {
    parts.push(`<rect x="${x + 80}" y="${y + 70}" width="260" height="280" fill="#a9a9a9" stroke="#7d7d7d" stroke-width="4"/>`);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++)
      parts.push(`<rect x="${x + 370 + i * 54}" y="${y + 100 + j * 70}" width="14" height="14" fill="#8c8c8c"/>`);
    parts.push(`<line x1="${x + 300}" y1="${y + 40}" x2="${x + 520}" y2="${y + 40}" stroke="#e0b000" stroke-width="8"/><rect x="${x + 292}" y="${y + 32}" width="18" height="18" fill="#c08f00"/>`);
    return parts.join("");
  }
  // complete
  parts.length = 0;
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#7f9a5a"/>`);
  parts.push(`<rect x="${x + 80}" y="${y + 70}" width="400" height="280" fill="#e6e3dc" stroke="#9b978e" stroke-width="5"/>`);
  parts.push(`<rect x="${x + 120}" y="${y + 100}" width="50" height="40" fill="#5a7fa6"/><rect x="${x + 380}" y="${y + 260}" width="60" height="50" fill="#bdbdbd"/>`);
  parts.push(`<rect x="${x + 60}" y="${y + 380}" width="440" height="70" fill="#7a7a7a"/>`);
  for (let i = 0; i < 10; i++) parts.push(`<line x1="${x + 80 + i * 42}" y1="${y + 385}" x2="${x + 80 + i * 42}" y2="${y + 445}" stroke="#eee" stroke-width="2"/>`);
  return parts.join("");
}

function road(stage: number) {
  const parts: string[] = [];
  // corridor running diagonally through the site
  const corridor = (width: number, color: string, extra = "") =>
    `<line x1="250" y1="760" x2="950" y2="140" stroke="${color}" stroke-width="${width}" stroke-linecap="butt" ${extra}/>`;
  if (stage === 0) return shrubs() + corridor(14, "#a58e66");
  if (stage >= 1) parts.push(corridor(170, "#d9c7a1"));
  if (stage >= 2) parts.push(corridor(120, "#a89a85"));
  if (stage === 2) parts.push(`<rect x="520" y="440" width="44" height="24" fill="#e0b000"/>`);
  if (stage === 3) {
    parts.push(`<line x1="250" y1="760" x2="600" y2="450" stroke="#4a4a4a" stroke-width="120"/>`);
    parts.push(`<rect x="640" y="380" width="44" height="24" fill="#e0b000"/>`);
  }
  if (stage === 4) {
    parts.push(corridor(120, "#454545"));
    parts.push(corridor(4, "#f2f2f2", 'stroke-dasharray="28 22"'));
    parts.push(`<line x1="230" y1="720" x2="910" y2="117" stroke="#e8e8e8" stroke-width="3"/><line x1="290" y1="800" x2="990" y2="183" stroke="#e8e8e8" stroke-width="3"/>`);
  }
  return parts.join("");
}

function linear(stage: number) {
  // An existing arterial road; works run along its median.
  const parts = [`<rect x="560" y="0" width="160" height="${H}" fill="#6a6a6a"/>`];
  const cars = [[590, 210], [670, 480], [600, 620], [680, 300]];
  parts.push(cars.map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="40" rx="5" fill="#d9d9d9"/>`).join(""));
  if (stage === 0) {
    parts.push(`<line x1="640" y1="0" x2="640" y2="${H}" stroke="#ececec" stroke-width="4" stroke-dasharray="26 20"/>`);
    return shrubs() + parts.join("");
  }
  const end = stage === 1 ? 300 : stage === 2 ? 520 : H;
  parts.push(`<rect x="620" y="120" width="40" height="${end - 120}" fill="#c9a24a"/>`);
  for (let yy = 130; yy < end; yy += 30) parts.push(`<rect x="616" y="${yy}" width="48" height="8" fill="#d33"/>`);
  if (stage >= 2) for (let yy = 150; yy < end; yy += 90) parts.push(`<rect x="626" y="${yy}" width="28" height="28" fill="#8a8a8a"/>`);
  if (stage >= 3) {
    const deckEnd = stage === 3 ? 520 : H;
    parts.push(`<rect x="605" y="140" width="70" height="${deckEnd - 140}" fill="#c4c1ba" stroke="#9a968e" stroke-width="3"/>`);
  }
  if (stage === 4) parts.push(`<rect x="560" y="330" width="160" height="160" fill="#e3e0d8" stroke="#9a968e" stroke-width="4"/><rect x="575" y="345" width="130" height="20" fill="#3b6ea5"/>`);
  return parts.join("");
}

function pond(stage: number) {
  const parts: string[] = [];
  // crop strips around the site
  for (let i = 0; i < 8; i++) parts.push(`<rect x="${SITE.x - 40}" y="${SITE.y - 40 + i * 70}" width="${SITE.w + 80}" height="34" fill="${i % 2 ? "#9fae6a" : "#b7b57a"}" opacity="0.6"/>`);
  const cx = 610, cy = 425;
  if (stage === 0) return parts.join("");
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="230" ry="160" fill="none" stroke="#7a5c3a" stroke-width="6" stroke-dasharray="16 10"/>`);
  if (stage === 1) return parts.join("") + `<rect x="${cx + 200}" y="${cy + 150}" width="40" height="22" fill="#e0b000"/>`;
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="250" ry="180" fill="#b89a6e"/><ellipse cx="${cx}" cy="${cy}" rx="210" ry="140" fill="#8a6a45"/>`);
  if (stage === 2) return parts.join("") + `<rect x="${cx - 20}" y="${cy - 10}" width="40" height="22" fill="#e0b000"/>`;
  if (stage === 3) return parts.join("") + `<ellipse cx="${cx + 40}" cy="${cy + 40}" rx="110" ry="70" fill="#5f87a8"/>`;
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="250" ry="180" fill="#6f8f4c"/><ellipse cx="${cx}" cy="${cy}" rx="210" ry="140" fill="#3f6f99"/>`);
  return parts.join("");
}

const DRAW: Record<SiteLayout, (stage: number) => string> = { building, road, linear, pond };

function svgFor(layout: SiteLayout, stage: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <g filter="url(#grain)">${surroundings()}${DRAW[layout](stage)}</g>
    <rect x="16" y="${H - 48}" width="330" height="32" rx="4" fill="#000" opacity="0.45"/>
    <text x="30" y="${H - 26}" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#fff">DEMO IMAGERY · not actual site</text>
  </svg>`;
}

export async function generateDemoImagery(layouts: SiteLayout[] = ["building", "road", "linear", "pond"]) {
  await fs.mkdir(DEMO_IMAGERY_DIR, { recursive: true });
  for (const layout of layouts) {
    for (const stage of STAGES) {
      const base = sharp(Buffer.from(svgFor(layout, stage)));
      const png = await base.png().toBuffer();
      for (let v = 0; v < VARIANTS; v++) {
        let img = sharp(png);
        if (v === 1) img = img.flop();
        if (v === 2) img = img.rotate(180);
        await img.jpeg({ quality: 82 }).toFile(path.join(process.cwd(), "public", demoImagePath(layout, stage, v)));
      }
    }
  }
}
