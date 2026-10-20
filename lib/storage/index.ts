import "server-only";
import { localStorage } from "./local";

/**
 * File storage for imagery. Keys are relative paths like
 * "imagery/<projectId>/<uuid>/original.jpg". Files are private: they are only
 * ever served through app/api/imagery/[id]/route.ts after an access check.
 *
 * To move to S3 (or similar), implement this interface and return it below.
 */
export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  /** Removes everything under a key prefix (used only to clean up failed uploads). */
  removePrefix(prefix: string): Promise<void>;
}

export const storage: FileStorage = localStorage;

/** Variant keys for an image whose original is stored at `originalKey`. */
export function variantKeys(originalKey: string) {
  const dir = originalKey.slice(0, originalKey.lastIndexOf("/"));
  return { original: originalKey, display: `${dir}/display.webp`, thumb: `${dir}/thumb.webp` };
}
