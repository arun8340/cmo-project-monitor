"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { imageryUrl } from "@/lib/imagery/url";
import type { CompareImage } from "@/lib/data/compare";
import { SOURCE_META } from "@/components/imagery/source-meta";
import { paintChanges, type DiffMap } from "./change-detection";
import { isZoomed, panBy, zoomAt, type View } from "./sync-view";
import { useTranslations } from "next-intl";
import { useLabels } from "@/lib/i18n/client";

type Props = {
  image: CompareImage;
  order: number;
  view: View;
  setView: (update: (v: View) => View) => void;
  /** Change overlay for this pane (not for the baseline pane). */
  diff: DiffMap | null;
  showChanges: boolean;
  sensitivity: number;
  changedShare: number | null;
  onChangedShare: (share: number | null) => void;
  baselineLabel: string | null;
};

type Rect = { left: number; top: number; width: number; height: number };

function containRect(paneW: number, paneH: number, imgW: number, imgH: number): Rect {
  const scale = Math.min(paneW / imgW, paneH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { left: (paneW - width) / 2, top: (paneH - height) / 2, width, height };
}

/** One dated image; zoom/pan gestures update the shared view used by every pane. */
export function ComparePane({ image, order, view, setView, diff, showChanges, sensitivity, changedShare, onChangedShare, baselineLabel }: Props) {
  const paneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: image.width ?? 1200, h: image.height ?? 800 });
  const meta = SOURCE_META[image.source];
  const t = useTranslations("compare");
  const source = useLabels().source[image.source];

  // Track the pane's size.
  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mouse wheel zoom (needs a non-passive listener to stop the page scrolling).
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => zoomAt(v, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  // Drag to pan, two fingers to pinch-zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const onPointerDown = (e: React.PointerEvent) => {
    paneRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !paneRef.current) return;
    const r = paneRef.current.getBoundingClientRect();
    const pts = [...pointers.current.entries()];
    if (pts.length === 1) {
      setView((v) => panBy(v, (e.clientX - prev.x) / r.width, (e.clientY - prev.y) / r.height));
    } else if (pts.length === 2) {
      const other = pts.find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const mx = ((e.clientX + other.x) / 2 - r.left) / r.width;
      const my = ((e.clientY + other.y) / 2 - r.top) / r.height;
      if (before > 0) setView((v) => zoomAt(v, mx, my, after / before));
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const r = paneRef.current!.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setView((v) => (isZoomed(v) ? { s: 1, tx: 0, ty: 0 } : zoomAt(v, px, py, 3)));
  };

  // Paint the change overlay when it, or the sensitivity, changes.
  useEffect(() => {
    if (!diff || !showChanges || !canvasRef.current) {
      onChangedShare(null);
      return;
    }
    onChangedShare(paintChanges(canvasRef.current, diff, sensitivity));
  }, [diff, showChanges, sensitivity, onChangedShare]);

  const fit = size.w && size.h ? containRect(size.w, size.h, natural.w, natural.h) : null;

  return (
    <figure className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-black">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-white/10 bg-slate-900 px-3 py-1.5 text-xs">
        <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold">{order}</span>
        <span className="text-sm font-semibold">{image.dayLabel}</span>
        <span className="flex items-center gap-1 text-white/70">
          <meta.icon className="size-3.5" style={{ color: meta.color }} />
          {source}
        </span>
        <span className="text-white/70">{t("paneProgress", { progress: image.reportedProgress })}</span>
        {showChanges && baselineLabel && (
          <span className="ml-auto rounded bg-red-500/20 px-1.5 py-0.5 font-medium text-red-200">
            {changedShare == null ? t("comparing") : t("changedSince", { percent: Math.round(changedShare * 100), date: baselineLabel })}
          </span>
        )}
      </figcaption>
      <div
        ref={paneRef}
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${isZoomed(view) ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        data-testid="compare-pane"
      >
        <div
          className="absolute inset-0 origin-top-left will-change-transform"
          style={{ transform: `translate(${view.tx * 100}%, ${view.ty * 100}%) scale(${view.s})` }}
        >
          {fit && (
            <div className="absolute" style={{ left: fit.left, top: fit.top, width: fit.width, height: fit.height }}>
              {/* Access-checked API image; same-origin so the change overlay can read its pixels. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageryUrl(image.id, "display")}
                alt={t("imageAlt", { source, date: image.dayLabel })}
                draggable={false}
                className="size-full"
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
              {diff && (
                <canvas
                  ref={canvasRef}
                  className={`pointer-events-none absolute inset-0 size-full transition-opacity ${showChanges ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
              )}
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
