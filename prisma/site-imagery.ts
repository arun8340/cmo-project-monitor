/**
 * Real before/after satellite imagery for the demo seed: Google Earth
 * historical screenshots of actual construction sites, kept unaltered (with
 * their "Image © Airbus / Google Earth" credit) in prisma/seed-data/imagery.
 * Each is copied into private storage as sites/<name>/{original.jpg,
 * display.webp,thumb.webp}. Internal demo use only.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { makeVariants, STORAGE_ROOT_DEFAULT } from "../lib/imagery/variants";

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), STORAGE_ROOT_DEFAULT));
const SOURCE_DIR = path.join(process.cwd(), "prisma", "seed-data", "imagery");

/** Storage keys of seeded site imagery start with this (lib/demo.ts keeps their capture dates as-is). */
export const SITE_IMAGERY_PREFIX = "sites/";

/** Copies one image (a file in prisma/seed-data/imagery) into storage; returns its key and metadata. */
export async function storeSiteImage(file: string) {
  const original = await fs.readFile(path.join(SOURCE_DIR, file));
  const key = `${SITE_IMAGERY_PREFIX}${path.parse(file).name}/original.jpg`;
  const dir = path.join(STORAGE_ROOT, path.dirname(key));
  await fs.mkdir(dir, { recursive: true });
  const [{ display, thumb }, meta] = await Promise.all([makeVariants(original), sharp(original).metadata()]);
  await Promise.all([
    fs.writeFile(path.join(dir, "original.jpg"), original),
    fs.writeFile(path.join(dir, "display.webp"), display),
    fs.writeFile(path.join(dir, "thumb.webp"), thumb),
  ]);
  return { filePath: key, mimeType: "image/jpeg", width: meta.width ?? null, height: meta.height ?? null, sizeBytes: original.length };
}
