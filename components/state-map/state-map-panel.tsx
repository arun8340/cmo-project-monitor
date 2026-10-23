"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { MapPinOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { HEALTH_STYLE, type Health } from "@/lib/district-health";
import { districtHref } from "@/lib/district-slug";
import type { DistrictSummary } from "@/lib/data/state-overview";
import { localName } from "@/lib/i18n/names";

// Leaflet needs `window`, so the map only renders in the browser.
const StateMap = dynamic(() => import("./state-map"), {
  ssr: false,
  loading: () => <LoadingMap />,
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
  const t = useTranslations("map");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;
    fetch(props.geojsonUrl)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((json: FeatureCollection) => !cancelled && setData(json))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [props.geojsonUrl]);

  // Districts that exist in the database but have no shape in the GeoJSON file.
  const offMap = useMemo(() => {
    if (!data) return [];
    const onMap = new Set(
      data.features.map((f) =>
        String(f.properties?.[props.geoCodeProperty] ?? ""),
      ),
    );
    return props.districts.filter((d) => !onMap.has(d.geoCode));
  }, [data, props.districts, props.geoCodeProperty]);

  return (
    <section
      className="flex flex-col self-start rounded-xl border bg-card p-4 sm:p-5 lg:sticky lg:top-[7.5rem]"
      aria-labelledby="districts-heading"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id="districts-heading" className="text-lg font-bold text-navy">
            {t("panelTitle")}
          </h2>

        </div>
        <Legend />
      </div>
      {/* `isolate` keeps Leaflet's internal z-indexes below the sticky header */}
      {/* At least as tall as before (40rem); taller on taller screens. Stays in view while the side column scrolls. */}
      <div className="relative isolate h-105 overflow-hidden rounded-lg bg-[#f7f5f0] sm:h-140 lg:h-[max(40rem,calc(100svh-16rem))]">
        {error ? (
          <MapPlaceholder
            label={t("boundariesMissing", { path: props.geojsonUrl })}
          />
        ) : data ? (
          <StateMap data={data} {...props} />
        ) : (
          <LoadingMap />
        )}
      </div>

      {offMap.length > 0 && (
        // Folded by default so the panel (map included) fits the screen.
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground">
            <MapPinOffIcon className="size-4" />
            {t("notOnMap")} ({offMap.length}) — {t("notOnMapHint")}
            <span
              aria-hidden
              className="transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {offMap.map((d) => {
              const chip = (
                <>
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: HEALTH_STYLE[d.health].color }}
                  />
                  {localName(locale, d.name, d.nameLocal)}
                  <span className="text-muted-foreground">
                    · {d.counts.total}
                  </span>
                </>
              );
              return (
                <li key={d.geoCode}>
                  {d.accessible ? (
                    <Link
                      href={districtHref(
                        props.basePath,
                        d.slug,
                        props.styleKey,
                      )}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-[13px] font-semibold text-navy hover:bg-muted"
                    >
                      {chip}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1 text-[13px] text-muted-foreground">
                      {chip}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

const LEGEND_ORDER: Health[] = ["good", "warning", "critical", "none"];

function Legend() {
  const t = useTranslations("map");
  return (
    <ul
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground"
      aria-label={t("legendTitle")}
    >
      {LEGEND_ORDER.map((h) => (
        <li
          key={h}
          className="flex items-center gap-1.5"
          title={t(`health.${h}.description`)}
        >
          <span
            className="size-3 rounded-[3px] border"
            style={{
              backgroundColor: HEALTH_STYLE[h].fill,
              borderColor: HEALTH_STYLE[h].stroke,
            }}
          />
          {t(`health.${h}.label`)}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-[3px] border border-dashed border-[#cfc9bb] bg-[#f1eee6]" />
        {t("outsideAccess")}
      </li>
    </ul>
  );
}

function LoadingMap() {
  return <MapPlaceholder label={useTranslations("map")("loading")} />;
}

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex size-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
