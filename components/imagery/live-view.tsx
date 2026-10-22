"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon, ChevronRightIcon, RadioIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageryUrl } from "@/lib/imagery/url";
import { DateCompare } from "./date-compare";

export type LiveImage = { id: string; dayLabel: string; sourceLabel: string; ago: string; reportedProgress: number };

type Props = {
  project: { name: string; districtName: string };
  /** Oldest first. */
  images: LiveImage[];
  initialId: string;
  closeHref: string;
  compareHref: string;
  uploadHref: string | null;
};

/**
 * "Live tracking": full-screen view of the latest satellite image of a site,
 * with every available capture date to step through and a two-date compare.
 */
export function LiveView({ project, images, initialId, closeHref, compareHref, uploadHref }: Props) {
  const t = useTranslations("tracking");
  const [index, setIndex] = useState(() => Math.max(0, images.findIndex((i) => i.id === initialId)));
  const current = images[index];
  const latest = index === images.length - 1;
  const newestFirst = [...images].reverse();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-[#0d1726] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-amber uppercase">
            <RadioIcon className="size-3.5" />
            {t("title")}
          </div>
          <h1 className="truncate text-lg font-bold">{project.name}</h1>
          <p className="text-xs text-white/60">{project.districtName}</p>
        </div>
        <div className="flex items-center gap-2">
          {uploadHref && (
            <Button variant="secondary" nativeButton={false} render={<Link href={uploadHref} />}>
              <UploadIcon />
              {t("addImages")}
            </Button>
          )}
          <Link href={closeHref} aria-label={t("close")} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white">
            <XIcon className="size-5" />
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative min-h-0">
          {/* Access-checked API image (see app/api/imagery). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={current.id} src={imageryUrl(current.id, "display")} alt={t("imageAlt", { date: current.dayLabel })} className="absolute inset-0 size-full object-contain" />
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-bold uppercase ${latest ? "bg-amber text-navy" : "bg-white/15 text-white"}`}>
              {latest ? t("latest") : t("earlier")}
            </span>
            <span className="rounded-md bg-black/60 px-2.5 py-1 text-sm font-semibold">
              {current.dayLabel} · {current.sourceLabel}
            </span>
            <span className="rounded-md bg-black/60 px-2.5 py-1 text-xs text-white/80">
              {current.ago} · {t("reported", { percent: current.reportedProgress })}
            </span>
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                aria-label={t("older")}
                className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70 disabled:opacity-30"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
                disabled={latest}
                aria-label={t("newer")}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70 disabled:opacity-30"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </>
          )}
        </div>

        <aside className="flex max-h-[42svh] flex-col gap-4 overflow-y-auto border-t border-white/10 p-4 lg:max-h-none lg:border-t-0 lg:border-l">
          <div>
            <h2 className="mb-2 text-sm font-bold">{t("availableDates", { count: images.length })}</h2>
            <ul className="grid gap-1.5">
              {newestFirst.map((img) => {
                const i = images.indexOf(img);
                const on = i === index;
                return (
                  <li key={img.id}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-current={on || undefined}
                      className={`flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors ${on ? "bg-white/15 ring-1 ring-amber" : "hover:bg-white/10"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageryUrl(img.id, "thumb")} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                      <span className="min-w-0 text-sm leading-tight">
                        <span className="block font-semibold">{img.dayLabel}</span>
                        <span className="block text-xs text-white/60">
                          {img.sourceLabel}
                          {i === images.length - 1 && <> · {t("latest")}</>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {images.length > 1 && (
            <div className="border-t border-white/10 pt-4">
              <h2 className="mb-2 text-sm font-bold">{t("compareDates")}</h2>
              <DateCompare options={images.map((i) => ({ id: i.id, label: i.dayLabel }))} compareHref={compareHref} tone="dark" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
