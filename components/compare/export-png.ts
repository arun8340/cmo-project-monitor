import { imageryUrl } from "@/lib/imagery/url";
import type { CompareImage } from "@/lib/data/compare";
import { paintChanges, type DiffMap } from "./change-detection";
import type { View } from "./sync-view";

type Options = {
  title: string;
  subtitle: string;
  images: CompareImage[];
  view: View;
  diffs: (DiffMap | null)[];
  showChanges: boolean;
  sensitivity: number;
  /** Text under each image's date, e.g. "Satellite · reported progress 40%" (already translated). */
  caption: (image: CompareImage) => string;
};

const CELL_W = 960;
const CELL_H = 640;
const CAPTION = 44;
const HEADER = 72;
const GAP = 12;

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Renders the comparison as one PNG, exactly as currently zoomed, with dates,
 * sources and (optionally) the change overlay. Returns a Blob.
 */
export async function exportComparison({ title, subtitle, images, view, diffs, showChanges, sensitivity, caption }: Options): Promise<Blob> {
  const n = images.length;
  const cols = n === 4 ? 2 : n;
  const rows = Math.ceil(n / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * CELL_W + (cols + 1) * GAP;
  canvas.height = HEADER + rows * (CELL_H + CAPTION) + (rows + 1) * GAP;
  const ctx = canvas.getContext("2d")!;
  const font = (w: number, px: number) => `${w} ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(600, 26);
  ctx.fillText(title, GAP + 4, 34);
  ctx.fillStyle = "#94a3b8";
  ctx.font = font(400, 16);
  ctx.fillText(subtitle, GAP + 4, 58);

  const pictures = await Promise.all(images.map((im) => load(imageryUrl(im.id, "display"))));

  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = GAP + col * (CELL_W + GAP);
    const y0 = HEADER + GAP + row * (CELL_H + CAPTION + GAP);
    const im = images[i];

    // Caption
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x0, y0, CELL_W, CAPTION);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(600, 18);
    ctx.fillText(`${i + 1}.  ${im.dayLabel}`, x0 + 14, y0 + 28);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = font(400, 15);
    ctx.fillText(caption(im), x0 + 200, y0 + 28);

    // Image, contained in the cell and transformed like the on-screen pane
    const cy = y0 + CAPTION;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, cy, CELL_W, CELL_H);
    ctx.clip();
    ctx.fillStyle = "#000000";
    ctx.fillRect(x0, cy, CELL_W, CELL_H);
    const pic = pictures[i];
    const scale = Math.min(CELL_W / pic.naturalWidth, CELL_H / pic.naturalHeight);
    const w = pic.naturalWidth * scale;
    const h = pic.naturalHeight * scale;
    ctx.translate(x0 + view.tx * CELL_W, cy + view.ty * CELL_H);
    ctx.scale(view.s, view.s);
    const fx = (CELL_W - w) / 2;
    const fy = (CELL_H - h) / 2;
    ctx.drawImage(pic, fx, fy, w, h);
    const diff = diffs[i];
    if (showChanges && diff) {
      const overlay = document.createElement("canvas");
      paintChanges(overlay, diff, sensitivity);
      ctx.drawImage(overlay, fx, fy, w, h);
    }
    ctx.restore();
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"));
}
