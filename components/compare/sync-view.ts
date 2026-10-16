/**
 * Shared zoom/pan state for the comparison panes. Positions are normalised to
 * the pane size (0–1), so every pane shows the same region of its image
 * whatever its pixel size. A pane's content is transformed with
 * `translate(tx*100%, ty*100%) scale(s)` from its top-left corner.
 */
export type View = { s: number; tx: number; ty: number };

export const IDENTITY: View = { s: 1, tx: 0, ty: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 12;

const clampView = ({ s, tx, ty }: View): View => {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  const lo = 1 - scale; // can't pan past the edges
  return { s: scale, tx: Math.min(0, Math.max(lo, tx)), ty: Math.min(0, Math.max(lo, ty)) };
};

/** Zoom by `factor`, keeping the point (px, py) (pane-normalised) fixed on screen. */
export function zoomAt(v: View, px: number, py: number, factor: number): View {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.s * factor));
  const lx = (px - v.tx) / v.s;
  const ly = (py - v.ty) / v.s;
  return clampView({ s, tx: px - s * lx, ty: py - s * ly });
}

export function panBy(v: View, dx: number, dy: number): View {
  return clampView({ ...v, tx: v.tx + dx, ty: v.ty + dy });
}

export const isZoomed = (v: View) => v.s > 1.001;
