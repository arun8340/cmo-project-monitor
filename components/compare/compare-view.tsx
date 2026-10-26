"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  DownloadIcon,
  LoaderCircleIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  ScanEyeIcon,
  XIcon,
} from "lucide-react";
import { imageryUrl } from "@/lib/imagery/url";
import type { CompareImage, VerificationRow } from "@/lib/data/compare";
import { SOURCE_META } from "@/components/imagery/source-meta";
import { computeDiff, type DiffMap } from "./change-detection";
import { exportComparison } from "./export-png";
import { ComparePane } from "./compare-pane";
import { IDENTITY, MAX_SCALE, panBy, zoomAt, type View } from "./sync-view";
import { VerificationDialog } from "./verification-dialog";
import { useLocale, useTranslations } from "next-intl";
import { useLabels } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/config";

const MAX = 4;

type Props = {
  project: { id: string; name: string; districtName: string };
  stateSlug: string;
  basePath: string;
  images: CompareImage[];
  initialSelection: string[];
  projects: { id: string; name: string; district: string }[];
  previousVerifications: VerificationRow[];
  canVerify: boolean;
  closeHref: string;
};

const btn =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-white/90 hover:bg-white/10 disabled:opacity-40";
const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10 disabled:opacity-40";

/**
 * Full-screen comparison of 2–4 dated images. Zooming or panning any image
 * applies the same view to all of them, so the same spot stays aligned.
 */
export function CompareView({
  project,
  stateSlug,
  basePath,
  images,
  initialSelection,
  projects,
  previousVerifications,
  canVerify,
  closeHref,
}: Props) {
  const router = useRouter();
  const t = useTranslations("compare");
  const tApp = useTranslations("app");
  const labels = useLabels();
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [view, setViewState] = useState<View>(IDENTITY);
  const [showChanges, setShowChanges] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [diffs, setDiffs] = useState<Record<string, DiffMap>>({});
  const [shares, setShares] = useState<Record<string, number | null>>({});
  const [fullscreen, setFullscreen] = useState(false);
  // Where the Fullscreen API isn't available (iPhone Safari), "full screen" hides the toolbars instead.
  const [focus, setFocus] = useState(false);
  const immersive = fullscreen || focus;
  const [exporting, setExporting] = useState(false);

  const setView = useCallback(
    (update: (v: View) => View) => setViewState(update),
    [],
  );

  // Panes are always oldest → newest.
  const panes = useMemo(
    () => images.filter((i) => selected.includes(i.id)),
    [images, selected],
  );
  const baseline = panes[0];

  // Keep the selection in the URL (shareable) without a server round trip.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("images", panes.map((p) => p.id).join(","));
    window.history.replaceState(null, "", url);
  }, [panes]);

  // Compute pixel differences against the oldest selected image when needed.
  useEffect(() => {
    if (!showChanges || !baseline) return;
    let cancelled = false;
    for (const p of panes.slice(1)) {
      const key = `${baseline.id}>${p.id}`;
      if (diffs[key]) continue;
      computeDiff(
        imageryUrl(baseline.id, "display"),
        imageryUrl(p.id, "display"),
      )
        .then((d) => !cancelled && setDiffs((m) => ({ ...m, [key]: d })))
        .catch(() => toast.error(t("diffFailed")));
    }
    return () => {
      cancelled = true;
    };
  }, [showChanges, baseline, panes, diffs, t]);

  const shareSetters = useMemo(
    () =>
      Object.fromEntries(
        panes.map((p) => [
          p.id,
          (s: number | null) =>
            setShares((m) => (m[p.id] === s ? m : { ...m, [p.id]: s })),
        ]),
      ),
    [panes],
  );

  const close = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push(closeHref);
  }, [router, closeHref]);

  // Keyboard: Esc closes, + / − / 0 zoom, arrows pan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys typed into form fields or inside the verification popup.
      if (
        (e.target as HTMLElement)?.closest(
          "input, textarea, select, [data-slot=dialog-content]",
        )
      )
        return;
      if (e.key === "Escape" && focus) setFocus(false);
      else if (e.key === "Escape" && !document.fullscreenElement) close();
      else if (e.key === "+" || e.key === "=")
        setView((v) => zoomAt(v, 0.5, 0.5, 1.4));
      else if (e.key === "-" || e.key === "_")
        setView((v) => zoomAt(v, 0.5, 0.5, 1 / 1.4));
      else if (e.key === "0") setView(() => IDENTITY);
      else if (e.key.startsWith("Arrow")) {
        const d = 0.08;
        const [dx, dy] = {
          ArrowLeft: [d, 0],
          ArrowRight: [-d, 0],
          ArrowUp: [0, d],
          ArrowDown: [0, -d],
        }[e.key] ?? [0, 0];
        setView((v) => panBy(v, dx, dy));
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, setView, focus]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (focus) setFocus(false);
    else if (document.fullscreenEnabled && rootRef.current?.requestFullscreen)
      rootRef.current.requestFullscreen().catch(() => setFocus(true));
    else setFocus(true);
  }

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) {
        if (cur.length <= 2) {
          toast.info(t("minImages"));
          return cur;
        }
        return cur.filter((x) => x !== id);
      }
      if (cur.length >= MAX) {
        toast.info(t("maxImages", { max: MAX }));
        return cur;
      }
      return [...cur, id];
    });
  }

  async function download() {
    setExporting(true);
    try {
      const blob = await exportComparison({
        title: project.name,
        subtitle: t("exportSubtitle", {
          district: project.districtName,
          from: panes[0].dayLabel,
          to: panes.at(-1)!.dayLabel,
          date: new Date().toLocaleDateString(intlLocale(locale), {
            timeZone: "Asia/Kolkata",
          }),
          app: tApp("name"),
        }),
        caption: (im) =>
          t("exportCaption", {
            source: labels.source[im.source],
            progress: im.reportedProgress,
          }),
        images: panes,
        view,
        diffs: panes.map((p, i) =>
          i === 0 ? null : (diffs[`${baseline.id}>${p.id}`] ?? null),
        ),
        showChanges,
        sensitivity,
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `comparison-${panes[0].day}-to-${panes.at(-1)!.day}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  const byDistrict = useMemo(() => {
    const m = new Map<string, Props["projects"]>();
    for (const p of projects)
      m.set(p.district, [...(m.get(p.district) ?? []), p]);
    return [...m.entries()];
  }, [projects]);

  const grid =
    panes.length === 2
      ? "md:grid-cols-2"
      : panes.length === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2 md:grid-rows-2";
  const gapMonths = baseline
    ? Math.round(
        (new Date(panes.at(-1)!.day).getTime() -
          new Date(baseline.day).getTime()) /
          (30.44 * 86_400_000),
      )
    : 0;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("dialogLabel", { project: project.name })}
      className="fixed inset-0 z-[45] flex flex-col bg-navy text-white"
    >
      {immersive && (
        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-2 z-10 flex gap-1.5">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-md bg-black/65 px-3 py-2 text-sm font-semibold"
          >
            <MinimizeIcon className="size-4" />
            {t("exitFullscreen")}
          </button>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-3 py-2 ${immersive ? "hidden" : ""}`}
      >
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
          <select
            aria-label={t("project")}
            value={project.id}
            onChange={(e) =>
              router.push(`${basePath}/project/${e.target.value}/compare`)
            }
            className="w-full truncate rounded-md border border-white/15 bg-navy-soft px-2 py-1 text-sm font-semibold text-white sm:w-auto sm:max-w-full"
          >
            {byDistrict.map(([district, list]) => (
              <optgroup key={district} label={district}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {baseline && (
            <div className="mt-0.5 truncate text-xs text-white/60">
              {project.districtName} · {baseline.dayLabel} →{" "}
              {panes.at(-1)!.dayLabel}
              {gapMonths > 0 &&
                ` · ${t("monthsApart", { count: gapMonths })}`}{" "}
              ·{" "}
              {t("reportedProgress", {
                from: baseline.reportedProgress,
                to: panes.at(-1)!.reportedProgress,
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5"
          role="group"
          aria-label={t("zoom")}
        >
          <button
            type="button"
            className={iconBtn}
            onClick={() => setView((v) => zoomAt(v, 0.5, 0.5, 1 / 1.4))}
            disabled={view.s <= 1}
            aria-label={t("zoomOut")}
          >
            <MinusIcon className="size-4" />
          </button>
          <span
            className="w-12 text-center text-xs tabular-nums text-white/80"
            aria-live="polite"
          >
            {Math.round(view.s * 100)}%
          </span>
          <button
            type="button"
            className={iconBtn}
            onClick={() => setView((v) => zoomAt(v, 0.5, 0.5, 1.4))}
            disabled={view.s >= MAX_SCALE}
            aria-label={t("zoomIn")}
          >
            <PlusIcon className="size-4" />
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => setView(() => IDENTITY)}
            disabled={view.s === 1}
            aria-label={t("resetZoom")}
          >
            <RotateCcwIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showChanges}
              onChange={(e) => setShowChanges(e.target.checked)}
              className="size-4 accent-red-500"
            />
            <ScanEyeIcon className="size-4 text-red-300" />
            {t("showChanges")}
          </label>
          {showChanges && (
            <label className="flex items-center gap-1.5 text-xs text-white/70">
              {t("sensitivity")}
              <input
                type="range"
                min={0}
                max={100}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-20 accent-red-500"
                aria-label={t("sensitivityLabel")}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={btn}
            onClick={download}
            disabled={exporting || panes.length < 2}
          >
            {exporting ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            <span className="hidden lg:inline">{t("download")}</span>
          </button>
          {canVerify && panes.length >= 2 && (
            <VerificationDialog
              projectId={project.id}
              stateSlug={stateSlug}
              images={panes}
              previous={previousVerifications}
            />
          )}
          <button
            type="button"
            className={iconBtn}
            onClick={toggleFullscreen}
            aria-label={immersive ? t("exitFullscreen") : t("fullscreen")}
          >
            {immersive ? (
              <MinimizeIcon className="size-4" />
            ) : (
              <MaximizeIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={close}
            aria-label={t("close")}
          >
            <XIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Images */}
      <div className={`grid min-h-0 flex-1 auto-rows-fr gap-2 p-2 ${grid}`}>
        {panes.map((p, i) => (
          <ComparePane
            key={p.id}
            image={p}
            order={i + 1}
            view={view}
            setView={setView}
            diff={i === 0 ? null : (diffs[`${baseline.id}>${p.id}`] ?? null)}
            showChanges={showChanges && i > 0}
            sensitivity={sensitivity}
            changedShare={shares[p.id] ?? null}
            onChangedShare={shareSetters[p.id]}
            baselineLabel={i === 0 ? null : baseline.dayLabel}
            role={i === 0 ? "before" : i === panes.length - 1 ? "after" : null}
          />
        ))}
      </div>

      {showChanges && !immersive && (
        <p className="px-3 pb-1 text-center text-[11px] text-white/50">
          {t("changesNote")}
        </p>
      )}

      {/* Image picker */}
      <div
        className={`border-t border-white/10 px-3 py-2 ${immersive ? "hidden" : ""}`}
      >
        <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
          <span>{t("pickerHint", { max: MAX })}</span>
          <span className="hidden sm:inline">
            {t("selected", { count: selected.length })}
          </span>
        </div>
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((im) => {
            const idx = panes.findIndex((p) => p.id === im.id);
            const on = idx >= 0;
            const meta = SOURCE_META[im.source];
            return (
              <li key={im.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => toggle(im.id)}
                  aria-pressed={on}
                  className={`relative block w-28 overflow-hidden rounded-md border-2 text-left transition ${
                    on
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageryUrl(im.id, "thumb")}
                    alt=""
                    className="aspect-3/2 w-full object-cover"
                    loading="lazy"
                  />
                  {on && (
                    <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-900">
                      {idx + 1}
                    </span>
                  )}
                  {on && (
                    <CheckIcon className="absolute top-1 right-1 size-4 rounded-full bg-white p-0.5 text-slate-900" />
                  )}
                  <span className="block bg-navy-soft px-1.5 py-1 text-[11px] leading-tight">
                    <span className="block font-medium">{im.dayLabel}</span>
                    <span className="flex items-center gap-1 text-white/60">
                      <meta.icon
                        className="size-3"
                        style={{ color: meta.color }}
                      />
                      {labels.source[im.source]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
