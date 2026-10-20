"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Highlight = { dept: string | null; project: string | null };
type Ctx = Highlight & { set: (h: Highlight) => void };

const HighlightContext = createContext<Ctx>({ dept: null, project: null, set: () => {} });

/** Shares "what the pointer is over" between a list (cards / rows) and the map beside it. */
export function MapHighlightProvider({ children }: { children: ReactNode }) {
  const [h, set] = useState<Highlight>({ dept: null, project: null });
  const value = useMemo(() => ({ ...h, set }), [h]);
  return <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>;
}

export const useMapHighlight = () => useContext(HighlightContext);

type Props = { dept?: string; project?: string; as?: "div" | "li" | "tr"; className?: string; children: ReactNode };

/** Wraps a card or table row so hovering / focusing it highlights its pins on the map. */
export function Highlight({ dept, project, as: Tag = "div", className, children }: Props) {
  const { set } = useMapHighlight();
  const on = () => set({ dept: dept ?? null, project: project ?? null });
  const off = () => set({ dept: null, project: null });
  return (
    <Tag className={className} onMouseEnter={on} onMouseLeave={off} onFocus={on} onBlur={off}>
      {children}
    </Tag>
  );
}
