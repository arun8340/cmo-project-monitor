import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** Pieces shared by the project lists (department list, Projects page). */

export function Chip({
  href,
  active,
  label,
  count,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-navy bg-navy font-semibold text-white"
          : "bg-card text-foreground hover:bg-muted"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {color && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      <span className={active ? "text-white/70" : "text-muted-foreground"}>
        {count}
      </span>
    </Link>
  );
}

export function EmptyState({
  searched,
  clearHref,
  emptyText,
}: {
  searched: boolean;
  clearHref: string;
  emptyText: string;
}) {
  const t = useTranslations("projectList");
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
      <SearchXIcon className="size-6 text-muted-foreground" />
      <p className="font-medium">{searched ? t("noMatch") : emptyText}</p>
      {searched && (
        <Link
          href={clearHref}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {tc("clearFilters")}
        </Link>
      )}
    </div>
  );
}
