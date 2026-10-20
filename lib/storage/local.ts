import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { FileStorage } from "./index";
import { demoPaths } from "@/lib/demo";

/**
 * Local disk storage under STORAGE_DIR (default ./storage, git-ignored), or in
 * demo mode a temporary copy of the bundled demo imagery (see lib/demo.ts).
 * `turbopackIgnore`: these are runtime data files, not code to bundle.
 */
const ROOT = path.resolve(
  /*turbopackIgnore: true*/ demoPaths()?.storageDir || process.env.STORAGE_DIR || path.join(process.cwd(), "storage"),
);

function resolveKey(key: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ ROOT, key);
  // Never allow a key to escape the storage root.
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export const localStorage: FileStorage = {
  async put(key, data) {
    const full = resolveKey(key);
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
    await fs.writeFile(/*turbopackIgnore: true*/ full, data);
  },
  async get(key) {
    try {
      return await fs.readFile(/*turbopackIgnore: true*/ resolveKey(key));
    } catch {
      return null;
    }
  },
  async removePrefix(prefix) {
    await fs.rm(/*turbopackIgnore: true*/ resolveKey(prefix), { recursive: true, force: true });
  },
};
