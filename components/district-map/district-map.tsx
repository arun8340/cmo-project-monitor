"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import { BASEMAP } from "@/config/map";
import { STATUS_COLOR } from "@/lib/district-health";
import { useTranslations } from "next-intl";
import { useLabels } from "@/lib/i18n/client";
import type { ProjectPin } from "@/lib/data/district";

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

/**
 * District boundary with a pin per project site, coloured by status.
 * Leaflet is created fresh on every mount (see components/state-map/state-map.tsx).
 */
export default function DistrictMap({ geojsonUrl, geoCodeProperty, geoCode, center, pins, basePath }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  const labels = useLabels();
  const hint = useTranslations("map")("clickToOpenProject");
  // Read inside the map effect, so a language change doesn't rebuild the map.
  const textRef = useRef({ labels, hint });
  useEffect(() => {
    routerRef.current = router;
    textRef.current = { labels, hint };
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

    const markers = L.featureGroup().addTo(map);
    const text = textRef.current;
    for (const p of pins) {
      L.circleMarker([p.latitude, p.longitude], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: STATUS_COLOR[p.status],
        fillOpacity: 0.95,
      })
        .bindTooltip(
          `<div class="sm-tt-name">${escapeHtml(p.name)}</div>` +
            `<div class="sm-tt-health"><i style="background:${STATUS_COLOR[p.status]}"></i>${escapeHtml(text.labels.projectStatus[p.status])} · ${p.progressPercent}%</div>` +
            `<div class="sm-tt-muted">${escapeHtml(p.departmentName)}</div>` +
            `<div class="sm-tt-hint">${escapeHtml(text.hint)}</div>`,
          { direction: "top", offset: [0, -8], className: "sm-tooltip", opacity: 1 },
        )
        .on("click", () => routerRef.current.push(`${basePath}/project/${p.id}`))
        .addTo(markers);
    }

    const fit = (bounds: L.LatLngBounds) => {
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], animate: false, maxZoom: 13 });
    };
    fit(markers.getBounds());

    // Outline the district once its boundary loads (newer districts have none).
    fetch(geojsonUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FeatureCollection | null) => {
        if (cancelled || !data) return;
        const feature = data.features.find((f) => f.properties?.[geoCodeProperty] === geoCode);
        if (!feature) return;
        const outline = L.geoJSON(feature, {
          style: { color: "#0f172a", weight: 2, fill: true, fillColor: "#0f172a", fillOpacity: 0.04 },
          interactive: false,
        }).addTo(map);
        outline.bringToBack();
        // Frame the project sites when there are any; otherwise the whole district.
        if (pins.length === 0) fit(outline.getBounds());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      // See state-map.tsx: neutralise Leaflet's pending zoom-animation timer.
      (map as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      map.stop();
      map.remove();
      container.remove();
    };
  }, [geojsonUrl, geoCodeProperty, geoCode, lat, lng, pins, basePath]);

  return <div ref={hostRef} className="size-full bg-slate-100" />;
}
