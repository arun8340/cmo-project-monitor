/**
 * Per-state configuration. Adding a new state = add an entry here + seed its
 * districts/departments (see prisma/seed-data). No other code should need to change.
 */

export type StateCode = "RJ" | "MH";

export type StateConfig = {
  code: StateCode;
  name: string;
  nameLocal: string;
  /** next-intl locale used for the local-language UI */
  locale: "hi" | "mr";
  /** Path (under /public) to the district boundaries GeoJSON */
  geojson: string;
  /**
   * Name of the GeoJSON feature property that holds the district code.
   * Each District row's `geoCode` must equal this property's value on its feature.
   */
  geoCodeProperty: string;
  mapCenter: [lat: number, lng: number];
  mapZoom: number;
  theme: {
    /** Accent colour used for headers / highlights for this state */
    primary: string;
  };
};

export const STATES: Record<StateCode, StateConfig> = {
  RJ: {
    code: "RJ",
    name: "Rajasthan",
    nameLocal: "राजस्थान",
    locale: "hi",
    geojson: "/geo/rajasthan-districts.geojson",
    geoCodeProperty: "geo_code",
    mapCenter: [26.6, 73.8],
    mapZoom: 6,
    theme: { primary: "#c2410c" }, // terracotta
  },
  MH: {
    code: "MH",
    name: "Maharashtra",
    nameLocal: "महाराष्ट्र",
    locale: "mr",
    geojson: "/geo/maharashtra-districts.geojson",
    geoCodeProperty: "geo_code",
    mapCenter: [19.4, 76.4],
    mapZoom: 6,
    theme: { primary: "#1d4ed8" }, // deep blue
  },
};

export const STATE_CODES = Object.keys(STATES) as StateCode[];

export function getStateConfig(code: string): StateConfig | undefined {
  return STATES[code as StateCode];
}
