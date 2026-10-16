"use client";

import dynamic from "next/dynamic";

// Leaflet needs `window`, so maps only render in the browser.
export const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

/** Read-only site map for the project page. */
export function SiteMap({ latitude, longitude, color }: { latitude: number; longitude: number; color: string }) {
  return (
    <div className="relative isolate h-64 overflow-hidden rounded-lg border">
      <LocationMap value={[latitude, longitude]} fallbackCenter={[latitude, longitude]} color={color} />
    </div>
  );
}
