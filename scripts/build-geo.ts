/**
 * Builds public/geo/<state>-districts.geojson from an open district-boundary
 * dataset, tagging each feature with our district code (`geo_code`).
 *
 * Run: npm run geo:build
 *
 * Source: guneetnarula/indian-district-boundaries (MIT), 2019 districts.
 * Rajasthan has 33 districts in this dataset (current count: 41) — the newer
 * districts are listed as "Not yet on map" in the app. To use official
 * boundaries instead, replace the output files; each feature only needs a
 * `geo_code` property matching prisma/seed-data/districts.ts.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { STATES, STATE_CODES, type StateCode } from "../config/states";
import { DISTRICTS } from "../prisma/seed-data/districts";

const SOURCE_COMMIT = "d0347469bf845b96dd98fc61e80a28a8235190eb";
const SOURCE_URL = `https://raw.githubusercontent.com/guneetnarula/indian-district-boundaries/${SOURCE_COMMIT}/topojson/india-districts-2019-734.json`;
const ATTRIBUTION =
  "District boundaries: guneetnarula/indian-district-boundaries (MIT License), 2019 districts. Not an official boundary.";

/** Source state names (st_nm) */
const SOURCE_STATE: Record<StateCode, string> = { RJ: "Rajasthan", MH: "Maharashtra" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** ~11 m precision is plenty for a state overview map and keeps files small. */
function round(geometry: Geometry): Geometry {
  const r = (p: Position): Position => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4];
  switch (geometry.type) {
    case "Polygon":
      return { ...geometry, coordinates: geometry.coordinates.map((ring) => ring.map(r)) };
    case "MultiPolygon":
      return { ...geometry, coordinates: geometry.coordinates.map((poly) => poly.map((ring) => ring.map(r))) };
    default:
      return geometry;
  }
}

async function main() {
  console.log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const topology = (await res.json()) as Topology;
  const objectName = Object.keys(topology.objects)[0];
  const all = feature(topology, topology.objects[objectName] as GeometryCollection) as FeatureCollection;

  const outDir = path.join(process.cwd(), "public", "geo");
  await fs.mkdir(outDir, { recursive: true });
  let failed = false;

  for (const code of STATE_CODES) {
    const lookup = new Map<string, string>();
    for (const d of DISTRICTS[code]) {
      for (const n of [d.name, ...(d.aliases ?? [])]) lookup.set(norm(n), d.geoCode);
    }

    const features: Feature[] = [];
    const unmatched: string[] = [];
    for (const f of all.features) {
      if (f.properties?.st_nm !== SOURCE_STATE[code]) continue;
      const sourceName = String(f.properties?.district ?? "");
      const geoCode = lookup.get(norm(sourceName));
      if (!geoCode) {
        unmatched.push(sourceName);
        continue;
      }
      features.push({ type: "Feature", properties: { geo_code: geoCode, source_name: sourceName }, geometry: round(f.geometry) });
    }

    if (unmatched.length) {
      failed = true;
      console.error(`✘ ${code}: no district code for: ${unmatched.join(", ")} — add an alias in prisma/seed-data/districts.ts`);
    }
    const mapped = new Set(features.map((f) => f.properties!.geo_code));
    const missing = DISTRICTS[code].filter((d) => !mapped.has(d.geoCode)).map((d) => d.name);

    const file = path.join(process.cwd(), "public", STATES[code].geojson);
    const fc = { type: "FeatureCollection", attribution: ATTRIBUTION, features };
    await fs.writeFile(file, JSON.stringify(fc));
    const kb = Math.round((await fs.stat(file)).size / 1024);
    console.log(`✔ ${STATES[code].name}: ${features.length} districts → ${path.relative(process.cwd(), file)} (${kb} KB)`);
    if (missing.length) console.log(`  Not in source map (${missing.length}): ${missing.join(", ")}`);
  }

  process.exitCode = failed ? 1 : 0;
}

main();
