import type { StateCode } from "@/config/states";

/** "RJ-SAWAI-MADHOPUR" → "sawai-madhopur" (used in /rj/district/<slug>) */
export function districtSlug(geoCode: string) {
  return geoCode.split("-").slice(1).join("-").toLowerCase();
}

/** "sawai-madhopur" in RJ → "RJ-SAWAI-MADHOPUR" */
export function geoCodeFromSlug(stateCode: StateCode, slug: string) {
  return `${stateCode}-${slug.toUpperCase()}`;
}

/** District link; with a department filter active, go straight to that department's list. */
export function districtHref(basePath: string, slug: string, deptKey: string) {
  return `${basePath}/district/${slug}${deptKey === "all" ? "" : `/${deptKey.toLowerCase()}`}`;
}
