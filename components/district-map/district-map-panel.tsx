"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { deptColor, DEPT_ORDER } from "@/lib/departments";
import { localName } from "@/lib/i18n/names";
import type { ProjectPin } from "@/lib/data/district";
import { useMapHighlight } from "./highlight";

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
  /** Height of the map area (CSS class), e.g. a fixed height or one that fills a sticky column. */
  mapClassName?: string;
};

/** The district map with a legend of the departments present (colour + name + count). */
export function DistrictMapPanel({ mapClassName = "h-96", ...props }: Props) {
  const t = useTranslations("map");
  const locale = useLocale();
  const { dept: hovered } = useMapHighlight();

  const departments = new Map<string, { name: string; count: number }>();
  for (const p of props.pins) {
    const d = departments.get(p.departmentCode) ?? { name: localName(locale, p.departmentName, p.departmentNameLocal), count: 0 };
    d.count++;
    departments.set(p.departmentCode, d);
  }
  const legend = [...departments.entries()].sort(([a], [b]) => DEPT_ORDER.indexOf(a) - DEPT_ORDER.indexOf(b));

  return (
    <div className="flex flex-col gap-3">
      {/* `isolate` keeps Leaflet's internal z-indexes below the sticky header */}
      <div className={`relative isolate overflow-hidden rounded-lg border bg-[#f7f5f0] ${mapClassName}`}>
        <DistrictMap {...props} />
      </div>
      {props.pins.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t("noSites")}</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]" aria-label={t("byDepartment")}>
          {legend.map(([code, d]) => (
            <li key={code} className={`flex items-center gap-1.5 transition-opacity ${hovered && hovered !== code ? "opacity-40" : ""}`}>
              <span className="size-3 rounded-full ring-2 ring-white" style={{ backgroundColor: deptColor(code) }} />
              <span className="text-foreground">{d.name}</span>
              <span className="text-muted-foreground">{d.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Loading() {
  return <div className="flex size-full items-center justify-center text-sm text-muted-foreground">{useTranslations("map")("loading")}</div>;
}
