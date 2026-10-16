"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { BASEMAP } from "@/config/map";

type Props = {
  /** Current site, or null if not chosen yet. */
  value: [number, number] | null;
  /** Where to look when there is no site yet (district HQ). */
  fallbackCenter: [number, number];
  color?: string;
  /** When set, clicking the map moves the site. */
  onPick?: (latLng: [number, number]) => void;
};

/**
 * Single-site map. Leaflet is created fresh on every mount (see
 * components/state-map/state-map.tsx for why).
 */
export default function LocationMap({ value, fallbackCenter, color = "#c2410c", onPick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  const latestRef = useRef({ value, color });
  useEffect(() => {
    onPickRef.current = onPick;
    latestRef.current = { value, color };
  });
  const picking = !!onPick;
  const [fLat, fLng] = fallbackCenter;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    if (picking) container.style.cursor = "crosshair";
    host.appendChild(container);

    const map = L.map(container, { center: [fLat, fLng], zoom: 12, scrollWheelZoom: picking });
    L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxZoom: BASEMAP.maxZoom }).addTo(map);
    if (picking) map.on("click", (e: L.LeafletMouseEvent) => onPickRef.current?.([e.latlng.lat, e.latlng.lng]));
    mapRef.current = map;
    // A re-created map (e.g. page restored by Next.js) needs its marker again.
    placeMarker(map, markerRef, latestRef.current.value, latestRef.current.color);

    return () => {
      (map as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      map.stop();
      map.remove();
      container.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [fLat, fLng, picking]);

  // Show / move the site marker.
  const lat = value?.[0];
  const lng = value?.[1];
  useEffect(() => {
    if (mapRef.current) placeMarker(mapRef.current, markerRef, lat == null || lng == null ? null : [lat, lng], color);
  }, [lat, lng, color]);

  return <div ref={hostRef} className="size-full bg-slate-100" />;
}

function placeMarker(
  map: L.Map,
  markerRef: { current: L.CircleMarker | null },
  value: [number, number] | null,
  color: string,
) {
  if (!value) {
    markerRef.current?.remove();
    markerRef.current = null;
    return;
  }
  if (!markerRef.current) {
    markerRef.current = L.circleMarker(value, { radius: 9, color: "#ffffff", weight: 3, fillColor: color, fillOpacity: 1 }).addTo(map);
    map.setView(value, Math.max(map.getZoom(), 13), { animate: false });
  } else {
    markerRef.current.setLatLng(value);
  }
}
