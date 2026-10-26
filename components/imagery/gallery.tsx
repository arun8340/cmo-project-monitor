"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ColumnsIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MaximizeIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { imageryUrl } from "@/lib/imagery/url";
import { formatBytes } from "@/lib/format";
import { FAR_FROM_SITE_KM, formatDistance } from "@/lib/geo";
import type { ImagerySource } from "@/lib/constants";
import { SOURCE_META } from "./source-meta";
import { ImageViewer } from "./image-viewer";
import { useTranslations } from "next-intl";
import { useLabels } from "@/lib/i18n/client";

export type GalleryItem = {
  id: string;
  day: string; // YYYY-MM-DD
  dayLabel: string;
  yearLabel: string; // e.g. "2026"
  source: ImagerySource;
  notes: string | null;
  uploader: string | null;
  uploadedOn: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  gps: [number, number] | null;
  distanceKm: number | null;
  takenAt: string | null;
};

/** Thumbnails grouped by capture year, newest first, with the date on each tile and a large view (arrow keys to step through). */
export function Gallery({
  items,
  compareHref,
  latestId,
}: {
  items: GalleryItem[];
  compareHref: string | null;
  latestId: string | null;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index != null;
  // Full-screen viewer, opened from the dialog (which closes, so the two don't overlap).
  const [viewer, setViewer] = useState<number | null>(null);
  const step = useCallback(
    (d: number) =>
      setIndex((i) => (i == null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  const groups: {
    key: string;
    label: string;
    items: { item: GalleryItem; i: number }[];
  }[] = [];
  items.forEach((item, i) => {
    const key = item.day.slice(0, 4);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push({ item, i });
    else groups.push({ key, label: item.yearLabel, items: [{ item, i }] });
  });

  const current = index != null ? items[index] : null;
  const t = useTranslations("gallery");
  const labels = useLabels();

  return (
    <>
      <div className="grid gap-6">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`year-${g.key}`}>
            <h3 id={`year-${g.key}`} className="mb-2 text-sm font-medium">
              {g.label}{" "}
              <span className="font-normal text-muted-foreground">
                · {t("images", { count: g.items.length })}
              </span>
            </h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map(({ item, i }) => {
                const meta = SOURCE_META[item.source];
                const far =
                  item.distanceKm != null && item.distanceKm > FAR_FROM_SITE_KM;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      className="group block w-full overflow-hidden rounded-lg border bg-card text-left transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {/* Access-checked API image; the browser sends the session cookie. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageryUrl(item.id, "thumb")}
                        alt={t("imageAlt", {
                          source: labels.source[item.source],
                          date: item.dayLabel,
                        })}
                        loading="lazy"
                        className="aspect-4/3 w-full bg-muted object-cover"
                      />
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs">
                        <span className="min-w-0">
                          <span className="block font-bold text-navy">
                            {item.dayLabel}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <meta.icon
                              className="size-3.5"
                              style={{ color: meta.color }}
                            />
                            {labels.source[item.source]}
                          </span>
                        </span>
                        {far && (
                          <span
                            className="flex items-center gap-1 font-medium text-amber-700"
                            title={t("farTitle")}
                          >
                            <TriangleAlertIcon className="size-3" />
                            {formatDistance(item.distanceKm!)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-5xl"
          // Handled on the dialog itself: it doesn't let key events reach window listeners.
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
        >
          {current && (
            <LargeView
              item={current}
              position={t("position", { n: index! + 1, total: items.length })}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onFullscreen={() => {
                setViewer(index);
                setIndex(null);
              }}
              compareHref={
                compareHref && latestId && latestId !== current.id
                  ? `${compareHref}?images=${current.id},${latestId}`
                  : compareHref
              }
            />
          )}
        </DialogContent>
      </Dialog>
      {viewer !== null && (
        <ImageViewer
          images={items.map((i) => ({
            id: i.id,
            caption: `${labels.source[i.source]} · ${i.dayLabel}`,
          }))}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}

function LargeView({
  item,
  position,
  onPrev,
  onNext,
  onFullscreen,
  compareHref,
}: {
  item: GalleryItem;
  position: string;
  onPrev: () => void;
  onNext: () => void;
  onFullscreen: () => void;
  compareHref: string | null;
}) {
  const meta = SOURCE_META[item.source];
  const far = item.distanceKm != null && item.distanceKm > FAR_FROM_SITE_KM;
  const t = useTranslations("gallery");
  const source = useLabels().source[item.source];
  const tv = useTranslations("viewer");
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative flex items-center justify-center bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={imageryUrl(item.id, "display")}
          alt={t("imageAlt", { source, date: item.dayLabel })}
          onClick={onFullscreen}
          className="max-h-[70svh] w-full cursor-zoom-in object-contain"
        />
        <button
          type="button"
          onClick={onFullscreen}
          className="absolute right-2 bottom-2 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-black/80"
        >
          <MaximizeIcon className="size-4" />
          {tv("open")}
        </button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 left-2 -translate-y-1/2 opacity-90"
          onClick={onPrev}
          aria-label={t("previous")}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-1/2 right-2 -translate-y-1/2 opacity-90"
          onClick={onNext}
          aria-label={t("next")}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="grid content-start gap-4 p-4 text-sm">
        <div className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <meta.icon className="size-4" style={{ color: meta.color }} />
            {source} · {item.dayLabel}
          </DialogTitle>
          <DialogDescription className="mt-1">{position}</DialogDescription>
        </div>
        {item.notes && <p>{item.notes}</p>}
        <dl className="grid gap-2">
          <Row
            label={t("uploaded")}
            value={
              item.uploader
                ? t("uploadedBy", {
                    date: item.uploadedOn,
                    name: item.uploader,
                  })
                : item.uploadedOn
            }
          />
          {item.width && item.height && (
            <Row
              label={t("size")}
              value={`${item.width} × ${item.height}${item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}`}
            />
          )}
          {item.takenAt && <Row label={t("photoTaken")} value={item.takenAt} />}
          {item.gps ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("photoLocation")}
              </dt>
              <dd className="font-mono text-xs">
                {item.gps[0].toFixed(5)}, {item.gps[1].toFixed(5)}
              </dd>
              {item.distanceKm != null && (
                <dd
                  className={`mt-0.5 flex items-center gap-1 text-xs ${far ? "font-medium text-amber-700" : "text-muted-foreground"}`}
                >
                  {far ? (
                    <TriangleAlertIcon className="size-3" />
                  ) : (
                    <MapPinIcon className="size-3" />
                  )}
                  {far
                    ? t("fromSiteCheck", {
                        distance: formatDistance(item.distanceKm),
                      })
                    : t("fromSite", {
                        distance: formatDistance(item.distanceKm),
                      })}
                </dd>
              )}
            </div>
          ) : (
            <Row label={t("photoLocation")} value={t("notRecorded")} />
          )}
        </dl>
        {compareHref && (
          <Link
            href={compareHref}
            className="flex w-fit items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <ColumnsIcon className="size-3.5" />
            {t("compareLatest")}
          </Link>
        )}
        <a
          href={imageryUrl(item.id, "original")}
          target="_blank"
          rel="noopener"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3.5" />
          {t("openOriginal")}
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
