"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import { BASEMAP } from "@/config/map";
import { HEALTH_STYLE } from "@/lib/district-health";
import type { DistrictSummary } from "@/lib/data/state-overview";

type Props = {
  data: FeatureCollection;
  districts: DistrictSummary[];
  /** Link prefix for this state's pages ("" on its own portal, "/rj" on admin) */
  basePath: string;
  geoCodeProperty: string;
  center: [number, number];
  zoom: number;
  /** Changes when the department filter changes, to restyle the layer */
  styleKey: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function tooltipHtml(d: DistrictSummary) {
  const head = `<div class="sm-tt-name">${escapeHtml(d.name)} <span>${escapeHtml(d.nameLocal)}</span></div>`;
  if (!d.accessible) return `${head}<div class="sm-tt-muted">Outside your access</div>`;
  const c = d.counts;
  const h = HEALTH_STYLE[d.health];
  const rows = [
    ["Total projects", c.total],
    ["Completed", c.completed],
    ["On-going", c.ongoing],
    ["Delayed / stalled", c.delayed + c.stalled],
  ]
    .map(([label, value]) => `<div class="sm-tt-row"><span>${label}</span><b>${value}</b></div>`)
    .join("");
  return `${head}<div class="sm-tt-health"><i style="background:${h.color}"></i>${h.label}</div>${rows}<div class="sm-tt-hint">Click to open district</div>`;
}

/**
 * Leaflet is driven imperatively from effects rather than through react-leaflet.
 * Next.js keeps visited pages alive in hidden <Activity> boundaries, which
 * unmounts and re-runs effects on the same DOM. Creating a fresh map in a fresh
 * container on every mount (and removing it on cleanup) keeps that safe.
 */
export default function StateMap(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const router = useRouter();

  // Latest props/router for use inside Leaflet callbacks.
  const latest = useRef({ props, router });
  useEffect(() => {
    latest.current = { props, router };
  });

  const { data, center, zoom, districts, styleKey } = props;
  const [lat, lng] = center;

  // Create the map (and destroy it on unmount / when hidden).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    host.appendChild(container);

    const map = L.map(container, { center: [lat, lng], zoom, zoomSnap: 0.25, scrollWheelZoom: false });
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: BASEMAP.maxZoom }).addTo(map);

    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [12, 12], animate: false });
      map.setMaxBounds(bounds.pad(0.6));
      map.setMinZoom(map.getZoom() - 1);
    }
    mapRef.current = map;
    drawDistricts(map, layerRef, latest.current);

    return () => {
      layerRef.current = null;
      mapRef.current = null;
      // Leaflet finishes zoom animations on an untracked 250 ms timer, which throws
      // ("_leaflet_pos") if the map is gone by then. Clearing this flag makes it a no-op.
      (map as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      map.stop();
      map.remove();
      container.remove();
    };
  }, [data, lat, lng, zoom]);

  // Redraw districts when their figures change (e.g. department filter).
  useEffect(() => {
    if (mapRef.current) drawDistricts(mapRef.current, layerRef, latest.current);
  }, [districts, styleKey]);

  return <div ref={hostRef} className="size-full bg-slate-100" />;
}

function drawDistricts(
  map: L.Map,
  layerRef: { current: L.GeoJSON | null },
  { props, router }: { props: Props; router: ReturnType<typeof useRouter> },
) {
  layerRef.current?.remove();

  const byCode = new Map(props.districts.map((d) => [d.geoCode, d]));
  const districtFor = (f?: Feature) => byCode.get(String(f?.properties?.[props.geoCodeProperty] ?? ""));

  const style = (f?: Feature): L.PathOptions => {
    const d = districtFor(f);
    if (!d || !d.accessible) {
      return { color: "#94a3b8", weight: 1, dashArray: "3 3", fillColor: "#e2e8f0", fillOpacity: 0.35, className: "sm-locked" };
    }
    return { color: "#ffffff", weight: 1.5, fillColor: HEALTH_STYLE[d.health].color, fillOpacity: 0.6 };
  };

  layerRef.current = L.geoJSON(props.data, {
    style,
    onEachFeature: (f, layer) => {
      const d = districtFor(f);
      if (!d) return;
      const path = layer as L.Path;
      path.bindTooltip(tooltipHtml(d), { sticky: true, direction: "top", offset: [0, -8], className: "sm-tooltip", opacity: 1 });
      if (!d.accessible) return;
      path.on({
        mouseover: () => {
          path.setStyle({ weight: 3, color: "#0f172a", fillOpacity: 0.75 });
          path.bringToFront();
        },
        mouseout: () => path.setStyle(style(f)),
        click: () => router.push(`${props.basePath}/district/${d.slug}`),
      });
    },
  }).addTo(map);
}
