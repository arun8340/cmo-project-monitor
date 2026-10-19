"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("sections")} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
      {items.map((it) => {
        const on = it.fallback ? !anyMatch : matches(it);
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-[3px] px-3.5 py-2.5 text-[15px] transition-colors ${
              on ? "border-rust font-semibold text-navy" : "border-transparent text-muted-foreground hover:text-navy"
            }`}
          >
            {it.label}
            {it.count != null && it.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums ${it.danger ? "bg-bad text-white" : "bg-muted text-navy"}`}
                title={it.danger ? t("overdueCount", { count: it.count }) : t("openCount", { count: it.count })}
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
