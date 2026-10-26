"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { imageryUrl } from "@/lib/imagery/url";

export type ViewerImage = { id: string; caption: string };

const MAX_ZOOM = 6;

/**
 * Full-screen image viewer that works on every phone (a fixed overlay, not the
 * browser Fullscreen API, which iPhones don't support for pages). Pinch or
 * scroll to zoom, drag to move, double-tap to zoom in/out, swipe (or arrow
 * keys) between images, Escape or ✕ to close.
 */
export function ImageViewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ViewerImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("viewer");
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    dist: number;
    scale: number;
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
    startX: number;
  } | null>(null);
  const lastTap = useRef(0);
  const current = images[index];

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);
  const go = useCallback(
    (by: number) => {
      const next = index + by;
      if (next >= 0 && next < images.length) {
        reset();
        onIndex(next);
      }
    },
    [index, images.length, onIndex, reset],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  const zoomBy = (factor: number) =>
    setView((v) => {
      const scale = Math.min(MAX_ZOOM, Math.max(1, v.scale * factor));
      return scale === 1
        ? { scale: 1, x: 0, y: 0 }
        : { scale, x: (v.x * scale) / v.scale, y: (v.y * scale) / v.scale };
    });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const dist =
      pts.length === 2
        ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        : 0;
    gesture.current = {
      dist,
      scale: view.scale,
      x: view.x,
      y: view.y,
      cx: e.clientX,
      cy: e.clientY,
      moved: false,
      startX: e.clientX,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = Math.min(MAX_ZOOM, Math.max(1, (g.scale * dist) / g.dist));
      setView({
        scale,
        x: (g.x * scale) / g.scale,
        y: (g.y * scale) / g.scale,
      });
      g.moved = true;
    } else if (pts.length === 1) {
      const dx = e.clientX - g.cx;
      const dy = e.clientY - g.cy;
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
      if (view.scale > 1) setView((v) => ({ ...v, x: g.x + dx, y: g.y + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (!g) return;
    if (pointers.current.size > 0) {
      // One finger left after a pinch: carry on dragging from here.
      const [p] = [...pointers.current.values()];
      gesture.current = {
        ...g,
        dist: 0,
        scale: view.scale,
        x: view.x,
        y: view.y,
        cx: p.x,
        cy: p.y,
      };
      return;
    }
    gesture.current = null;
    // Swipe between images when not zoomed in.
    const swipe = e.clientX - g.startX;
    if (view.scale === 1 && Math.abs(swipe) > 60) return go(swipe < 0 ? 1 : -1);
    if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300)
        setView((v) =>
          v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 },
        );
      lastTap.current = now;
    }
  };

  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[70] flex flex-col bg-black text-white select-none"
    >
      <div className="flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm font-semibold">
          {current.caption}
          {images.length > 1 && (
            <span className="ml-2 font-normal text-white/60">
              {t("position", { n: index + 1, total: images.length })}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
      >
        {/* Access-checked API image (see app/api/imagery). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={imageryUrl(current.id, "display")}
          alt={current.caption}
          draggable={false}
          className="absolute inset-0 size-full object-contain will-change-transform"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label={t("previous")}
              className="absolute top-1/2 left-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 disabled:opacity-25"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => go(1)}
              disabled={index === images.length - 1}
              aria-label={t("next")}
              className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 disabled:opacity-25"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.5)}
          aria-label={t("zoomOut")}
          className="grid size-10 place-items-center rounded-full bg-white/15"
        >
          <MinusIcon className="size-5" />
        </button>
        <span className="w-14 text-center text-sm tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1.5)}
          aria-label={t("zoomIn")}
          className="grid size-10 place-items-center rounded-full bg-white/15"
        >
          <PlusIcon className="size-5" />
        </button>
        <span className="ml-2 hidden text-xs text-white/50 sm:inline">
          {t("hint")}
        </span>
      </div>
    </div>,
    document.body,
  );
}

/** A "Full screen" button that opens the viewer at `start`. */
export function FullscreenButton({
  images,
  start = 0,
  className = "",
  label,
}: {
  images: ViewerImage[];
  start?: number;
  className?: string;
  label?: boolean;
}) {
  const t = useTranslations("viewer");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(start);
        }}
        aria-label={t("open")}
        className={`inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-black/80 ${className}`}
      >
        <MaximizeIcon className="size-4" />
        {label && t("open")}
      </button>
      {open !== null && (
        <ImageViewer
          images={images}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
