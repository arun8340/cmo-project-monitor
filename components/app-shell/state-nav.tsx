"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; count?: number; danger?: boolean; section: "overview" | "issues" | "directives" };

/** Section links under the header; highlights the current section. */
export function StateNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const active = (it: Item) => {
    if (it.section === "overview") return !items.some((o) => o.section !== "overview" && (pathname === o.href || pathname.startsWith(`${o.href}/`)));
    return pathname === it.href || pathname.startsWith(`${it.href}/`);
  };
  return (
    <nav aria-label="Sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
      {items.map((it) => {
        const on = active(it);
        return (
          <Link
            key={it.section}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
              on ? "border-white font-medium text-white" : "border-transparent text-white/75 hover:text-white"
            }`}
          >
            {it.label}
            {it.count != null && it.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums ${it.danger ? "bg-red-600 text-white" : "bg-white/20 text-white"}`}
                title={it.danger ? `${it.count} overdue` : `${it.count} open`}
              >
                {it.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
