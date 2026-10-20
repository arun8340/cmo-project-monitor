import "server-only";
import { headers } from "next/headers";
import { portalFromHeaders, type Portal } from "@/config/portals";

/** The portal for the current request (see portalFromHeaders). */
export async function getCurrentPortal(): Promise<Portal | null> {
  return portalFromHeaders(await headers());
}
