import "server-only";
import { headers } from "next/headers";
import { getMainHost, portalFromHeaders, type Portal } from "@/config/portals";

/** The portal for the current request (see portalFromHeaders). */
export async function getCurrentPortal(): Promise<Portal | null> {
  return portalFromHeaders(await headers());
}

/** Full URL of the public main page (state selection), using this request's protocol. */
export async function getMainPageUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0] || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${getMainHost()}/`;
}
