import Link from "next/link";
import { AlertTriangleIcon, CheckCircle2Icon, ClipboardListIcon, ScrollTextIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_STATUS_COLOR } from "@/lib/district-health";
import type { StateOverview } from "@/lib/data/state-overview";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";

/** `basePath` prefixes links to the issue / directive lists ("" on a state portal). */
export function KpiPanel({ overview, basePath }: { overview: StateOverview; basePath: string }) {
  const { totals, issues, directives } = overview;
  const t = useTranslations("kpi");
  const ts = useTranslations("enums.projectStatus");
  const locale = useLocale();
  const breakdown = [
    { key: "completed", label: ts("COMPLETED"), value: totals.completed },
    { key: "ongoing", label: ts("ONGOING"), value: totals.ongoing },
    { key: "delayed", label: ts("DELAYED"), value: totals.delayed },
    { key: "stalled", label: ts("STALLED"), value: totals.stalled },
    { key: "notStarted", label: ts("NOT_STARTED"), value: totals.notStarted },
  ] as const;

  return (
    <div className="grid content-start gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClipboardListIcon className="size-4" />
            {t("projects")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="text-5xl font-semibold tracking-tight">{totals.total}</div>

          {totals.total > 0 && (
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={t("byStatus")}>
              {breakdown
                .filter((b) => b.value > 0)
                .map((b) => (
                  <span
                    key={b.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ flexGrow: b.value, backgroundColor: PROJECT_STATUS_COLOR[b.key] }}
                    title={`${b.label}: ${b.value}`}
                  />
                ))}
            </div>
          )}

          <ul className="grid gap-1.5 text-sm">
            {breakdown.map((b) => (
              <li key={b.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: PROJECT_STATUS_COLOR[b.key] }} />
                  {b.label}
                </span>
                <span className="font-medium tabular-nums">{b.value}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2Icon className="size-4" />
            {t("lastMeeting")}
            {issues.lastMeetingDate && <span className="ml-auto font-normal">{formatDate(issues.lastMeetingDate, locale)}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Tile label={t("pendingIssues")} value={issues.pendingAtLastMeeting} href={`${basePath}/issues`} />
            <Tile label={t("resolvedIssues")} value={issues.resolvedAtLastMeeting} href={`${basePath}/issues?status=resolved`} />
          </div>
          <p className="text-xs text-muted-foreground">
            {issues.lastMeetingDate ? t("openTotal", { count: issues.openTotal }) : t("noMeetings")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ScrollTextIcon className="size-4" />
            {t("directives")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Tile label={t("open")} value={directives.open} href={`${basePath}/directives`} />
          <Tile label={t("overdue")} value={directives.overdue} alert={directives.overdue > 0} href={`${basePath}/directives?tab=overdue`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, alert, href }: { label: string; value: number; alert?: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 transition hover:shadow-sm ${alert ? "border-red-200 bg-red-50 hover:bg-red-100/70" : "bg-muted/30 hover:bg-muted/60"}`}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className={`flex items-center gap-1 text-xs ${alert ? "text-red-700" : "text-muted-foreground"}`}>
        {alert && <AlertTriangleIcon className="size-3.5" />}
        {label}
      </div>
    </Link>
  );
}
