"use client";

import dynamic from "next/dynamic";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/lib/constants";
import { STATUS_COLOR } from "@/lib/district-health";
import type { ProjectPin } from "@/lib/data/district";

// Leaflet needs `window`, so the map only renders in the browser.
const DistrictMap = dynamic(() => import("./district-map"), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
});

type Props = {
  geojsonUrl: string;
  geoCodeProperty: string;
  geoCode: string;
  center: [number, number];
  pins: ProjectPin[];
  basePath: string;
};

export function DistrictMapPanel(props: Props) {
  const present = PROJECT_STATUSES.filter((s) => props.pins.some((p) => p.status === s));
  return (
    <div className="flex h-full flex-col gap-2">
      {/* `isolate` keeps Leaflet's internal z-indexes below the sticky header */}
      <div className="relative isolate min-h-80 flex-1 overflow-hidden rounded-xl border bg-slate-100">
        <DistrictMap {...props} />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Project site status">
        {present.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
            {PROJECT_STATUS_LABELS[s]}
          </li>
        ))}
        {props.pins.length === 0 && <li>No project sites in your view</li>}
      </ul>
    </div>
  );
}
