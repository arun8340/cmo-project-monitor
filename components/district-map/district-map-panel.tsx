"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { PROJECT_STATUSES } from "@/lib/constants";
import { useLabels } from "@/lib/i18n/client";
import { STATUS_COLOR } from "@/lib/district-health";
import type { ProjectPin } from "@/lib/data/district";

// Leaflet needs `window`, so the map only renders in the browser.
const DistrictMap = dynamic(() => import("./district-map"), {
  ssr: false,
  loading: () => <Loading />,
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
  const t = useTranslations("map");
  const labels = useLabels();
  return (
    <div className="flex h-full flex-col gap-2">
      {/* `isolate` keeps Leaflet's internal z-indexes below the sticky header */}
      <div className="relative isolate min-h-80 flex-1 overflow-hidden rounded-xl border bg-slate-100">
        <DistrictMap {...props} />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("siteStatus")}>
        {present.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
            {labels.projectStatus[s]}
          </li>
        ))}
        {props.pins.length === 0 && <li>{t("noSites")}</li>}
      </ul>
    </div>
  );
}

function Loading() {
  return <div className="flex size-full items-center justify-center text-sm text-muted-foreground">{useTranslations("map")("loading")}</div>;
}
