"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import { useLocale, useTranslations } from "next-intl";
import { BASEMAP } from "@/config/map";
import { useLabels } from "@/lib/i18n/client";
import { localName } from "@/lib/i18n/names";
import { deptColor } from "@/lib/departments";
import type { ProjectPin } from "@/lib/data/district";
import { useMapHighlight } from "./highlight";

type Props = {
  /** State boundaries file; the district's own feature is picked out by geo code. */
  geojsonUrl: string;
  geoCodeProperty: string;
  geoCode: string;
  /** Fallback centre when the district has no boundary (newer districts). */
  center: [number, number];
  pins: ProjectPin[];
  basePath: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Page background — what the area outside the district is painted with. */
const OUTSIDE = "#f7f5f0";
const WORLD: L.LatLngExpression[] = [
  [-89, -179],
  [-89, 179],
  [89, 179],
  [89, -179],
];
const toLatLngs = (ring: Position[]) => ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);

/** Outer rings of the district's polygon(s), as Leaflet coordinates. */
function outerRings(feature: Feature<Polygon | MultiPolygon>) {
  const g = feature.geometry;
  return g.type === "Polygon" ? [toLatLngs(g.coordinates[0])] : g.coordinates.map((poly) => toLatLngs(poly[0]));
}

const PIN = { radius: 7, weight: 2, color: "#ffffff", fillOpacity: 0.95 };

/**
 * One district on its own: street tiles inside the boundary, everything outside
 * it covered, the view locked to the district, and a pin per project coloured by
 * department. Pins listed in the highlight context (hovered card / row) are
 * emphasised and the rest fade. Leaflet is created fresh on every mount (see
 * components/state-map/state-map.tsx).
 */
export default function DistrictMap({ geojsonUrl, geoCodeProperty, geoCode, center, pins, basePath }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef(new Map<string, { marker: L.CircleMarker; dept: string }>());
  const router = useRouter();
  const routerRef = useRef(router);
  const labels = useLabels();
  const locale = useLocale();
  const hint = useTranslations("map")("clickToOpenProject");
  const highlight = useMapHighlight();
  // Read inside the map effect, so a language change doesn't rebuild the map.
  const textRef = useRef({ labels, hint, locale });
  useEffect(() => {
    routerRef.current = router;
    textRef.current = { labels, hint, locale };
  });
  const [lat, lng] = center;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    host.appendChild(container);

    const map = L.map(container, { center: [lat, lng], zoom: 9, zoomSnap: 0.25, scrollWheelZoom: false });
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: BASEMAP.maxZoom }).addTo(map);
    // Above the tiles, below the district outline and the pins.
    const maskPane = map.createPane("district-mask");
    maskPane.style.zIndex = "350";
    maskPane.style.pointerEvents = "none";

    const markers = L.featureGroup().addTo(map);
    const registry = markersRef.current;
    registry.clear();
    const text = textRef.current;
    for (const p of pins) {
      const color = deptColor(p.departmentCode);
      const marker = L.circleMarker([p.latitude, p.longitude], { ...PIN, fillColor: color })
        .bindTooltip(
          `<div class="sm-tt-name">${escapeHtml(localName(text.locale, p.name, p.nameLocal))}</div>` +
            `<div class="sm-tt-health"><i style="background:${color};border-radius:50%"></i>${escapeHtml(localName(text.locale, p.departmentName, p.departmentNameLocal))}</div>` +
            `<div class="sm-tt-row"><span>${escapeHtml(text.labels.projectStatus[p.status])}</span><b>${p.progressPercent}%</b></div>` +
            `<div class="sm-tt-hint">${escapeHtml(text.hint)}</div>`,
          { direction: "top", offset: [0, -8], className: "sm-tooltip", opacity: 1 },
        )
        .on("click", () => routerRef.current.push(`${basePath}/project/${p.id}`))
        .addTo(markers);
      registry.set(p.id, { marker, dept: p.departmentCode });
    }

    const lockTo = (bounds: L.LatLngBounds) => {
      if (!bounds.isValid()) return;
      // Release any earlier lock (the pin framing) before fitting the new area.
      map.setMaxBounds(undefined as unknown as L.LatLngBoundsExpression);
      map.setMinZoom(0);
      map.fitBounds(bounds, { padding: [16, 16], animate: false, maxZoom: 13 });
      map.setMaxBounds(bounds.pad(0.15));
      map.setMinZoom(Math.max(map.getZoom() - 0.5, 1));
    };
    // Until (or if) the boundary loads, frame the project sites.
    if (pins.length) lockTo(markers.getBounds().pad(0.2));

    fetch(geojsonUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeatureCollection | null) => {
        if (cancelled || !data) return;
        const feature = data.features.find((f) => f.properties?.[geoCodeProperty] === geoCode) as Feature<Polygon | MultiPolygon> | undefined;
        if (!feature) return; // newer districts have no boundary yet: keep the pin framing
        const rings = outerRings(feature);
        // Cover everything outside the district (a world-sized polygon with the district as holes).
        L.polygon([WORLD, ...rings], { pane: "district-mask", stroke: false, fillColor: OUTSIDE, fillOpacity: 1, interactive: false }).addTo(map);
        const outline = L.polygon(rings, { color: "#14243b", weight: 2, fill: false, interactive: false }).addTo(map);
        outline.bringToBack();
        lockTo(outline.getBounds());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      registry.clear();
      // See state-map.tsx: neutralise Leaflet's pending zoom-animation timer.
      (map as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      map.stop();
      map.remove();
      container.remove();
    };
  }, [geojsonUrl, geoCodeProperty, geoCode, lat, lng, pins, basePath]);

  // Emphasise the hovered department's or project's pins; fade the others.
  const { dept, project } = highlight;
  useEffect(() => {
    const active = dept != null || project != null;
    for (const [id, { marker, dept: d }] of markersRef.current) {
      const match = project ? id === project : d === dept;
      marker.setStyle(
        !active ? { ...PIN, opacity: 1 } : match ? { radius: project ? 11 : 9, weight: 3, opacity: 1, fillOpacity: 1 } : { ...PIN, opacity: 0.35, fillOpacity: 0.2 },
      );
      if (active && match) marker.bringToFront();
    }
  }, [dept, project]);

  return <div ref={hostRef} className="size-full" style={{ backgroundColor: OUTSIDE }} />;
}
