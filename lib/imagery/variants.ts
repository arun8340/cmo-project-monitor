/**
 * Display and thumbnail variants for an image. Plain module (no "server-only")
 * so the seed and migration scripts can share it with the app.
 */
import sharp from "sharp";

export const STORAGE_ROOT_DEFAULT = "storage";

export async function makeVariants(buf: Buffer) {
  // EXIF orientation is applied (`rotate()`) so variants display upright.
  const [display, thumb] = await Promise.all([
    sharp(buf).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(buf).rotate().resize({ width: 480, height: 360, fit: "cover" }).webp({ quality: 72 }).toBuffer(),
  ]);
  return { display, thumb };
}
