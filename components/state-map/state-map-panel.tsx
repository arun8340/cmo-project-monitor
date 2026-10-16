"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { MapPinOffIcon } from "lucide-react";
import { HEALTH_STYLE, type Health } from "@/lib/district-health";
import type { DistrictSummary } from "@/lib/data/state-overview";

// Leaflet needs `window`, so the map only renders in the browser.
const StateMap = dynamic(() => import("./state-map"), {
  ssr: false,
  loading: () => <MapPlaceholder label="Loading map…" />,
});

type Props = {
  geojsonUrl: string;
  geoCodeProperty: string;
  center: [number, number];
  zoom: number;
  basePath: string;
  districts: DistrictSummary[];
  styleKey: string;
};

export function StateMapPanel(props: Props) {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(props.geojsonUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: FeatureCollection) => !cancelled && setData(json))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [props.geojsonUrl]);

  // Districts that exist in the database but have no shape in the GeoJSON file.
  const offMap = useMemo(() => {
    if (!data) return [];
    const onMap = new Set(data.features.map((f) => String(f.properties?.[props.geoCodeProperty] ?? "")));
    return props.districts.filter((d) => !onMap.has(d.geoCode));
  }, [data, props.districts, props.geoCodeProperty]);

  return (
    <div className="flex flex-col gap-3">
      {/* `isolate` keeps Leaflet's internal z-indexes below the sticky header */}
      <div className="relative isolate flex flex-col gap-3">
        <div className="h-105 overflow-hidden rounded-xl border bg-slate-100 sm:h-140 lg:h-160">
          {error ? (
            <MapPlaceholder label={`District boundaries not found at ${props.geojsonUrl}. Run "npm run geo:build".`} />
          ) : data ? (
            <StateMap data={data} {...props} />
          ) : (
            <MapPlaceholder label="Loading map…" />
          )}
        </div>
        <Legend />
      </div>

      {offMap.length > 0 && (
        <div className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <MapPinOffIcon className="size-4 text-muted-foreground" />
            Not yet on map
            <span className="font-normal text-muted-foreground">— boundaries for these newer districts are pending</span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {offMap.map((d) => {
              const chip = (
                <>
                  <span className="size-2 rounded-full" style={{ backgroundColor: HEALTH_STYLE[d.health].color }} />
                  {d.name}
                  <span className="text-muted-foreground">{d.counts.total}</span>
                </>
              );
              return (
                <li key={d.geoCode}>
                  {d.accessible ? (
                    <Link
                      href={`${props.basePath}/district/${d.slug}`}
                      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                    >
                      {chip}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground">
                      {chip}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const LEGEND_ORDER: Health[] = ["good", "warning", "critical", "none"];

/** Below the map on phones; overlaid on the map's bottom-left corner from `sm` up. */
function Legend() {
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs sm:pointer-events-none sm:absolute sm:bottom-3 sm:left-3 sm:z-1000 sm:shadow-sm">
      <div className="mb-1 font-medium">District status</div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:grid sm:gap-1">
        {LEGEND_ORDER.map((h) => (
          <li key={h} className="flex items-center gap-2" title={HEALTH_STYLE[h].description}>
            <span className="size-3 rounded-sm" style={{ backgroundColor: HEALTH_STYLE[h].color, opacity: 0.85 }} />
            {HEALTH_STYLE[h].label}
          </li>
        ))}
        <li className="flex items-center gap-2 text-muted-foreground">
          <span className="size-3 rounded-sm border border-dashed border-slate-400 bg-slate-100" />
          Outside your access
        </li>
      </ul>
    </div>
  );
}

function MapPlaceholder({ label }: { label: string }) {
  return <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{label}</div>;
}
