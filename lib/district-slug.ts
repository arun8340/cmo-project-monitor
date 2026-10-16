import type { StateCode } from "@/config/states";

/** "RJ-SAWAI-MADHOPUR" → "sawai-madhopur" (used in /rj/district/<slug>) */
export function districtSlug(geoCode: string) {
  return geoCode.split("-").slice(1).join("-").toLowerCase();
}

/** "sawai-madhopur" in RJ → "RJ-SAWAI-MADHOPUR" */
export function geoCodeFromSlug(stateCode: StateCode, slug: string) {
  return `${stateCode}-${slug.toUpperCase()}`;
}
