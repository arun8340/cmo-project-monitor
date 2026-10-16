/**
 * One-off: moves imagery from public/uploads (publicly downloadable) into
 * private storage, creates display/thumbnail variants, and updates the
 * database paths. Keeps all existing data. Safe to re-run.
 *
 * Run: npm run imagery:migrate
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { makeVariants, STORAGE_ROOT_DEFAULT } from "../lib/imagery/variants";

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }) });
const PUBLIC = path.join(process.cwd(), "public");
const STORAGE = path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), STORAGE_ROOT_DEFAULT));
const MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function main() {
  const legacy = await db.imageryCapture.findMany({ where: { filePath: { startsWith: "/uploads/" } }, select: { id: true, filePath: true } });
  const paths = [...new Set(legacy.map((r) => r.filePath))];
  console.log(`${legacy.length} imagery records in ${paths.length} public files to migrate`);

  let migrated = 0;
  const missing: string[] = [];
  for (const publicPath of paths) {
    const source = path.join(PUBLIC, publicPath);
    let original: Buffer;
    try {
      original = await fs.readFile(source);
    } catch {
      missing.push(publicPath);
      continue;
    }
    // "/uploads/demo/building-s0-v0.jpg" → "demo/building-s0-v0/original.jpg"
    const rel = publicPath.replace(/^\/uploads\//, "");
    const ext = path.extname(rel) || ".jpg";
    const key = `${rel.slice(0, -ext.length)}/original${ext}`;
    const dir = path.join(STORAGE, path.dirname(key));

    const meta = await sharp(original).metadata();
    const { display, thumb } = await makeVariants(original);
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(STORAGE, key), original),
      fs.writeFile(path.join(dir, "display.webp"), display),
      fs.writeFile(path.join(dir, "thumb.webp"), thumb),
    ]);
    await db.imageryCapture.updateMany({
      where: { filePath: publicPath },
      data: { filePath: key, mimeType: MIME[meta.format ?? ""] ?? null, width: meta.width ?? null, height: meta.height ?? null, sizeBytes: original.length },
    });
    migrated++;
  }

  console.log(`✔ Migrated ${migrated} files into ${path.relative(process.cwd(), STORAGE)}/`);
  if (missing.length) {
    console.log(`✘ ${missing.length} files not found in public/ — records left unchanged:\n  ${missing.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  // Nothing references public/uploads any more: remove it so images can't be fetched publicly.
  await fs.rm(path.join(PUBLIC, "uploads"), { recursive: true, force: true });
  console.log("✔ Removed public/uploads");
}

main().finally(() => db.$disconnect());
