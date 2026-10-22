import Link from "next/link";
import { CircleAlertIcon, SearchXIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Highlight } from "@/components/district-map/highlight";
import { StatusBadge } from "@/components/project/status-badge";
import { ProgressCell } from "@/components/project/progress-cell";
import { deptColor } from "@/lib/departments";
import type { ProjectRow } from "@/lib/data/district";
import { localName, localNames } from "@/lib/i18n/names";
import { formatBudget, formatDate } from "@/lib/format";

/** Project list pieces shared by the department list and the state-wide Projects page. */

export function Chip({ href, active, label, count, color }: { href: string; active: boolean; label: string; count: number; color?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-navy bg-navy font-semibold text-white" : "bg-card text-foreground hover:bg-muted"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={active ? "text-white/70" : "text-muted-foreground"}>{count}</span>
    </Link>
  );
}

type RowOptions = { basePath: string; showDepartment: boolean; showDistrict?: boolean };

function ProjectName({ row, basePath, showDepartment, showDistrict }: RowOptions & { row: ProjectRow }) {
  const locale = useLocale();
  const name = localNames(locale, row.name, row.nameLocal);
  return (
    <div className="min-w-0">
      <Link href={`${basePath}/project/${row.id}`} className="font-semibold text-link hover:text-navy hover:underline">
        {name.primary}
      </Link>
      {name.secondary && <div className="truncate text-xs text-muted-foreground">{name.secondary}</div>}
      {(showDepartment || showDistrict) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {showDepartment && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: deptColor(row.departmentCode) }} />}
          {[showDepartment && localName(locale, row.departmentName, row.departmentNameLocal), showDistrict && localName(locale, row.districtName, row.districtNameLocal)]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}

export function ProjectTable({ rows, ...opts }: RowOptions & { rows: ProjectRow[] }) {
  const t = useTranslations("projectList");
  const locale = useLocale();
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="border-b bg-[#faf8f3] text-left text-[13px] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">{t("colProject")}</th>
            <th className="px-4 py-3 font-semibold">{t("colStatus")}</th>
            <th className="px-4 py-3 font-semibold">{t("colProgress")}</th>
            <th className="px-4 py-3 font-semibold">{t("colTimeline")}</th>
            <th className="px-4 py-3 text-right font-semibold">{t("colIssues")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <Highlight as="tr" key={r.id} project={r.id} className="align-top hover:bg-[#faf8f3]">
              <td className="min-w-48 px-4 py-3">
                <ProjectName row={r} {...opts} />
                <div className="mt-0.5 text-xs font-semibold text-navy tabular-nums">{formatBudget(r.budgetLakhs, locale)}</div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3">
                <ProgressCell actual={r.progressPercent} planned={r.plannedPercent} behind={r.behind} />
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                <div>{formatDate(r.startDate, locale)} →</div>
                <div>{formatDate(r.plannedEndDate, locale)}</div>
                {r.latestImagery && <div className="mt-1 text-foreground/70">{t("imageryOn", { date: formatDate(r.latestImagery, locale) })}</div>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.openIssues > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-red-700">
                    <CircleAlertIcon className="size-3.5" />
                    {r.openIssues}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
            </Highlight>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectCards({ rows, ...opts }: RowOptions & { rows: ProjectRow[] }) {
  const t = useTranslations("projectList");
  const locale = useLocale();
  return (
    <ul className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <Highlight as="li" key={r.id} project={r.id} className="grid gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <ProjectName row={r} {...opts} />
            <StatusBadge status={r.status} />
          </div>
          <ProgressCell actual={r.progressPercent} planned={r.plannedPercent} behind={r.behind} />
          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("colBudget")}</dt>
              <dd className="font-medium">{formatBudget(r.budgetLakhs, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("plannedEnd")}</dt>
              <dd className="font-medium">{formatDate(r.plannedEndDate, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("colIssues")}</dt>
              <dd className={`font-medium ${r.openIssues > 0 ? "text-red-700" : ""}`}>{r.openIssues}</dd>
            </div>
          </dl>
        </Highlight>
      ))}
    </ul>
  );
}

export function EmptyState({ searched, clearHref, emptyText }: { searched: boolean; clearHref: string; emptyText: string }) {
  const t = useTranslations("projectList");
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
      <SearchXIcon className="size-6 text-muted-foreground" />
      <p className="font-medium">{searched ? t("noMatch") : emptyText}</p>
      {searched && (
        <Link href={clearHref} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
          {tc("clearFilters")}
        </Link>
      )}
    </div>
  );
}
