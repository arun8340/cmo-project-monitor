"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  count?: number;
  danger?: boolean;
  /** Active when no other item matches (e.g. "Overview" for map, district and project pages). */
  fallback?: boolean;
};

/** Section links under the header; highlights the current section. */
export function StateNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

/** The links themselves; with no `pathname` (e.g. a Suspense fallback) nothing is highlighted. */
export function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  const matches = (it: NavItem) => pathname !== null && (pathname === it.href || (it.href !== "/" && pathname.startsWith(`${it.href}/`)));
  const anyMatch = pathname === null || items.some((it) => !it.fallback && matches(it));
  return (
    <nav aria-label="Sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
      {items.map((it) => {
        const on = it.fallback ? !anyMatch : matches(it);
        return (
          <Link
            key={it.key}
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
