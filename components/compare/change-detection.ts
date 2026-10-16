/**
 * Simple pixel-difference change detection (no AI/ML), run in the browser.
 *
 * Both images are drawn onto the same small grid (the later image stretched to
 * the earlier image's frame), lightly blurred to ignore compression noise, and
 * compared pixel by pixel. Works best for two captures with the same framing;
 * misaligned images show false changes.
 */

const GRID_WIDTH = 512;

export type DiffMap = { width: number; height: number; values: Uint8Array };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.filter = "blur(1.5px)";
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

/** Per-pixel difference (0–255) between a baseline and a later image. */
export async function computeDiff(baselineSrc: string, laterSrc: string): Promise<DiffMap> {
  const [a, b] = await Promise.all([loadImage(baselineSrc), loadImage(laterSrc)]);
  const width = GRID_WIDTH;
  const height = Math.max(1, Math.round((GRID_WIDTH * a.naturalHeight) / a.naturalWidth));
  const pa = pixels(a, width, height);
  const pb = pixels(b, width, height);
  const values = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < values.length; i += 4, p++) {
    values[p] = (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2])) / 3;
  }
  return { width, height, values };
}

/** Sensitivity 0–100 → difference threshold (higher sensitivity = smaller changes count). */
export const thresholdFor = (sensitivity: number) => Math.round(80 - sensitivity * 0.7);

/** Paints changed pixels red onto `canvas`; returns the share of the image that changed (0–1). */
export function paintChanges(canvas: HTMLCanvasElement, diff: DiffMap, sensitivity: number) {
  canvas.width = diff.width;
  canvas.height = diff.height;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(diff.width, diff.height);
  const t = thresholdFor(sensitivity);
  let changed = 0;
  for (let p = 0; p < diff.values.length; p++) {
    if (diff.values[p] > t) {
      changed++;
      const i = p * 4;
      out.data[i] = 239;
      out.data[i + 1] = 35;
      out.data[i + 2] = 35;
      out.data[i + 3] = 165;
    }
  }
  ctx.putImageData(out, 0, 0);
  return changed / diff.values.length;
}
