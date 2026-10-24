"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavSubItem = { href: string; label: string; hint?: string };

export type NavItem = {
  key: string;
  href: string;
  label: string;
  count?: number;
  danger?: boolean;
  /** Active when no other item matches (e.g. "Overview" for map, district and project pages). */
  fallback?: boolean;
  /** A submenu (opens on hover or click); its first entry is `href` itself, labelled `allLabel`. */
  children?: NavSubItem[];
  allLabel?: string;
  /** Other paths that belong to this section (e.g. /district/… for Districts). */
  also?: string[];
};

/** Section links under the header; highlights the current section. */
export function StateNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

/** The links themselves; with no `pathname` (e.g. a Suspense fallback) nothing is highlighted. */
export function NavLinks({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string | null;
}) {
  const under = (path: string, href: string) =>
    pathname === href || (href !== "/" && path.startsWith(`${href}/`));
  const matches = (it: NavItem) =>
    pathname !== null &&
    [it.href, ...(it.also ?? [])].some((h) => under(pathname, h));
  const anyMatch =
    pathname === null || items.some((it) => !it.fallback && matches(it));
  const t = useTranslations("nav");
  return (
    <nav
      aria-label={t("sections")}
      className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3"
    >
      {items.map((it) => {
        const on = it.fallback ? !anyMatch : matches(it);
        const tab = `-mb-px flex shrink-0 items-center gap-1.5 border-b-[3px] px-3.5 py-2.5 text-[15px] transition-colors outline-none focus-visible:bg-muted ${
          on
            ? "border-rust font-semibold text-navy"
            : "border-transparent text-muted-foreground hover:text-navy"
        }`;
        const body = (
          <>
            {it.label}
            {it.count != null && it.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums ${it.danger ? "bg-bad text-white" : "bg-muted text-navy"}`}
                title={
                  it.danger
                    ? t("overdueCount", { count: it.count })
                    : t("openCount", { count: it.count })
                }
              >
                {it.count}
              </span>
            )}
          </>
        );
        if (it.children?.length) {
          return (
            <DropdownMenu key={it.key}>
              <DropdownMenuTrigger
                openOnHover
                delay={80}
                aria-current={on ? "page" : undefined}
                className={tab}
              >
                {body}
                <ChevronDownIcon className="size-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto max-w-80 min-w-56">
                <DropdownMenuItem
                  render={<Link href={it.href} />}
                  className="font-semibold text-navy"
                >
                  {it.allLabel ?? it.label}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {it.children.map((c) => (
                  <DropdownMenuItem
                    key={c.href}
                    render={<Link href={c.href} />}
                    className="flex-col items-start gap-0"
                  >
                    <span>{c.label}</span>
                    {c.hint && (
                      <span className="text-xs text-muted-foreground">
                        {c.hint}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={tab}
          >
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
