import "server-only";
import sharp, { type Metadata } from "sharp";
import exifr from "exifr";
import { makeVariants } from "./variants";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 10;
const FORMATS = { jpeg: { ext: "jpg", mime: "image/jpeg" }, png: { ext: "png", mime: "image/png" }, webp: { ext: "webp", mime: "image/webp" } } as const;

export type ProcessedImage = {
  ext: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  original: Buffer;
  display: Buffer;
  thumb: Buffer;
  exif: { latitude: number | null; longitude: number | null; takenAt: Date | null };
};

export type ImageProblem = "empty" | "tooLarge" | "heic" | "unreadable" | "format";

/** A file that can't be accepted; `code` is translated by the caller ("actions.image.*"). */
export class ImageError extends Error {
  constructor(
    readonly code: ImageProblem,
    readonly fileName: string,
  ) {
    super(`${fileName}: ${code}`);
  }
}

/** Raw GPS tags must be picked too: exifr computes `latitude`/`longitude` from them. */
const EXIF_TAGS = ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef"];

/** HEIC/HEIF (iPhone default) — sharp's prebuilt binaries can't decode it. */
function isHeic(buf: Buffer) {
  const brand = buf.subarray(4, 12).toString("latin1");
  return brand.startsWith("ftyp") && /heic|heix|hevc|heim|heis|mif1|msf1/.test(brand.slice(4));
}

/**
 * Validates an uploaded image by its content (not its name), reads EXIF GPS
 * and capture time, and produces display (≤2400 px) and thumbnail (480 px)
 * WebP variants. The original bytes are kept unchanged as evidence.
 */
export async function processImage(buf: Buffer, fileName: string): Promise<ProcessedImage> {
  if (buf.length === 0) throw new ImageError("empty", fileName);
  if (buf.length > MAX_FILE_BYTES) throw new ImageError("tooLarge", fileName);
  if (isHeic(buf)) throw new ImageError("heic", fileName);

  let meta: Metadata;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new ImageError("unreadable", fileName);
  }
  const format = FORMATS[meta.format as keyof typeof FORMATS];
  if (!format) throw new ImageError("format", fileName);

  const { display, thumb } = await makeVariants(buf);

  let exif: ProcessedImage["exif"] = { latitude: null, longitude: null, takenAt: null };
  try {
    const tags = await exifr.parse(buf, { gps: true, pick: EXIF_TAGS });
    if (tags) {
      const lat = typeof tags.latitude === "number" ? tags.latitude : null;
      const lng = typeof tags.longitude === "number" ? tags.longitude : null;
      const taken = tags.DateTimeOriginal ?? tags.CreateDate;
      exif = {
        latitude: lat != null && Math.abs(lat) <= 90 ? lat : null,
        longitude: lng != null && Math.abs(lng) <= 180 ? lng : null,
        takenAt: taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken : null,
      };
    }
  } catch {
    // No or malformed EXIF — fine.
  }

  const rotated = (meta.orientation ?? 1) >= 5;
  return {
    ext: format.ext,
    mimeType: format.mime,
    width: (rotated ? meta.height : meta.width) ?? 0,
    height: (rotated ? meta.width : meta.height) ?? 0,
    sizeBytes: buf.length,
    original: buf,
    display,
    thumb,
    exif,
  };
}
