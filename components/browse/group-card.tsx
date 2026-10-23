import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SatelliteIcon } from "lucide-react";
import {
  HEALTH_STYLE,
  PROJECT_STATUS_COLOR,
  type Health,
  type StatusCounts,
} from "@/lib/district-health";
import { imageryUrl } from "@/lib/imagery/url";
import { formatDate } from "@/lib/format";

/**
 * A district or department on the Districts / Departments pages: its latest
 * satellite image, health, and project counts by status.
 */
export function GroupCard({
  href,
  title,
  titleSecondary,
  meta,
  health,
  counts,
  latestImage,
}: {
  href: string;
  title: string;
  titleSecondary?: string | null;
  meta?: ReactNode;
  health: Health;
  counts: StatusCounts;
  latestImage: { id: string; captureDate: Date } | null;
}) {
  const t = useTranslations("browse");
  const th = useTranslations("map.health");
  const locale = useLocale();
  const segments = (
    ["completed", "ongoing", "delayed", "stalled", "notStarted"] as const
  ).filter((k) => counts[k] > 0);
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-[#0d1726]">
        {latestImage ? (
          <>
            {/* Access-checked API image (see app/api/imagery). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageryUrl(latestImage.id, "thumb")}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute right-2 bottom-2 rounded-md bg-navy/85 px-2 py-0.5 text-xs font-semibold text-white">
              {t("latestImage", {
                date: formatDate(latestImage.captureDate, locale),
              })}
            </span>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative backdrop */}
            <img
              src="/landing/05.webp"
              alt=""
              aria-hidden
              className="size-full scale-110 object-cover opacity-90 blur-[2px] saturate-[0.8]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/45 to-navy/10"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <span className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                <SatelliteIcon className="size-5" />
              </span>
              <span className="text-sm font-semibold">{t("noImagery")}</span>
            </div>
          </>
        )}
        <span
          className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-xs font-semibold ${HEALTH_STYLE[health].pill}`}
        >
          {th(`${health}.label`)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h2 className="leading-snug font-bold text-navy group-hover:underline">
            {title}
            {titleSecondary && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {titleSecondary}
              </span>
            )}
          </h2>
          {meta && (
            <div className="text-[13px] text-muted-foreground">{meta}</div>
          )}
        </div>
        {counts.total > 0 && (
          <div className="mt-auto grid gap-1.5">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              {segments.map((k) => (
                <span
                  key={k}
                  style={{
                    width: `${(counts[k] / counts.total) * 100}%`,
                    backgroundColor: PROJECT_STATUS_COLOR[k],
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span>
                {t.rich("projectsCount", {
                  count: counts.total,
                  b: (c) => <b className="text-navy tabular-nums">{c}</b>,
                })}
              </span>
              <span>
                <b className="text-ok tabular-nums">{counts.completed}</b>{" "}
                {t("completed")}
              </span>
              <span>
                <b className="text-info tabular-nums">{counts.ongoing}</b>{" "}
                {t("ongoing")}
              </span>
              {counts.delayed + counts.stalled > 0 && (
                <span>
                  <b className="text-bad tabular-nums">
                    {counts.delayed + counts.stalled}
                  </b>{" "}
                  {t("behind")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
