import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { findAccessibleProject, getCurrentUser } from "@/lib/auth/dal";
import { storage, variantKeys } from "@/lib/storage";

/**
 * Serves an imagery file after the same checks as the project page: signed in,
 * on the right portal, and the project inside the user's scope. Anything else
 * gets a plain 404 so the response never reveals whether an image exists.
 *
 *   /api/imagery/<id>?v=thumb | display | original   (default: display)
 */
const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, ctx: RouteContext<"/api/imagery/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return NOT_FOUND();

  const capture = await db.imageryCapture.findUnique({ where: { id }, select: { projectId: true, filePath: true, mimeType: true } });
  if (!capture || !(await findAccessibleProject(user, capture.projectId))) return NOT_FOUND();

  const v = request.nextUrl.searchParams.get("v") ?? "display";
  const keys = variantKeys(capture.filePath);
  const key = v === "thumb" ? keys.thumb : v === "original" ? keys.original : keys.display;
  const body = await storage.get(key);
  if (!body) return NOT_FOUND();

  const type = v === "original" ? (capture.mimeType ?? "application/octet-stream") : "image/webp";
  const headers = new Headers({
    "Content-Type": type,
    "Content-Length": String(body.length),
    // Per-user, never shared caches. Images never change once uploaded.
    "Cache-Control": "private, max-age=86400, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (v === "original") headers.set("Content-Disposition", `inline; filename="imagery-${id}.${keys.original.split(".").pop()}"`);
  return new Response(new Uint8Array(body), { headers });
}
