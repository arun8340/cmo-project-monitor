import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Panel, PanelLink, StatCard } from "@/components/app-shell/page-parts";
import { IssueStatusBadge, pill, TONE_PILL } from "@/components/workflow/badges";
import type { StateOverview } from "@/lib/data/state-overview";
import type { IssueStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { localName } from "@/lib/i18n/names";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** The headline numbers across the top of the state dashboard. */
export function KpiRow({ overview, basePath }: { overview: StateOverview; basePath: string }) {
  const t = useTranslations("kpi");
  const { totals, issues } = overview;
  const behind = totals.delayed + totals.stalled;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard label={t("totalProjects")} value={totals.total} hint={t("acrossDepartments", { count: overview.departments.length })} />
      <StatCard label={t("completed")} value={totals.completed} tone="ok" hint={t("ofTotal", { percent: pct(totals.completed, totals.total) })} />
      <StatCard label={t("ongoing")} value={totals.ongoing} tone="info" hint={t("ofTotal", { percent: pct(totals.ongoing, totals.total) })} />
      <StatCard label={t("delayedStalled")} value={behind} tone="bad" hint={t("behindSchedule")} />
      <StatCard
        label={t("openIssues")}
        value={issues.openTotal}
        tone="warn"
        hint={issues.lastMeetingDate ? t("pendingAtMeeting", { count: issues.pendingAtLastMeeting }) : t("noMeetings")}
        href={`${basePath}/issues`}
      />
    </div>
  );
}

/** Right-hand column: last review meeting, projects by department, latest directives. */
export function DashboardSide({ overview, basePath }: { overview: StateOverview; basePath: string }) {
  const t = useTranslations("kpi");
  const locale = useLocale();
  const ln = (n: { name: string; nameLocal: string | null } | null) => (n ? localName(locale, n.name, n.nameLocal) : "");
  const { issues, directives, recentIssues, recentDirectives } = overview;
  const maxDept = Math.max(1, ...overview.departments.map((d) => d.projects));
  const departments = [...overview.departments].sort((a, b) => b.projects - a.projects);

  return (
    <div className="grid content-start gap-4">
      <Panel
        title={t("lastMeeting")}
        action={issues.lastMeetingDate && <span className="text-sm text-muted-foreground">{formatDate(issues.lastMeetingDate, locale)}</span>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Link href={`${basePath}/issues`} className="rounded-lg bg-warn-soft p-3 transition hover:brightness-[0.98]">
            <div className="text-[28px] leading-none font-bold text-warn">{issues.pendingAtLastMeeting}</div>
            <div className="mt-1.5 text-[13px] font-semibold text-warn">{t("pendingIssues")}</div>
          </Link>
          <Link href={`${basePath}/issues?status=resolved`} className="rounded-lg bg-ok-soft p-3 transition hover:brightness-[0.98]">
            <div className="text-[28px] leading-none font-bold text-ok">{issues.resolvedAtLastMeeting}</div>
            <div className="mt-1.5 text-[13px] font-semibold text-ok">{t("resolvedIssues")}</div>
          </Link>
        </div>
        {!issues.lastMeetingDate && <p className="mt-3 text-[13px] text-muted-foreground">{t("noMeetings")}</p>}
        {recentIssues.length > 0 && (
          <ul className="mt-3 divide-y border-t">
            {recentIssues.map((i) => (
              <li key={i.id} className="py-2.5">
                <Link href={`${basePath}/issues/${i.id}`} className="text-sm leading-snug font-semibold text-navy hover:underline">
                  {i.title} – {ln(i.project)}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                  {ln(i.department)} · {ln(i.district)} · <IssueStatusBadge status={i.status as IssueStatus} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1">
          <PanelLink href={`${basePath}/issues`}>{t("viewAll")}</PanelLink>
        </div>
      </Panel>

      {departments.length > 1 && (
        <Panel title={t("byDepartment")}>
          <ul className="grid gap-3">
            {departments.map((d) => (
              <li key={d.code}>
                <Link href={`${basePath || "/"}?dept=${d.code.toLowerCase()}`} className="group block" scroll={false}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="group-hover:underline">{localName(locale, d.name, d.nameLocal)}</span>
                    <span className="font-bold text-navy tabular-nums">{d.projects}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-info" style={{ width: `${(d.projects / maxDept) * 100}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t("directivesTitle")}>
        {recentDirectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOpenDirectives")}</p>
        ) : (
          <ul className="divide-y border-t">
            {recentDirectives.map((d) => {
              const target = [ln(d.district), ln(d.department)].filter(Boolean).join(" · ");
              return (
                <li key={d.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`${basePath}/directives/${d.id}`} className="line-clamp-2 text-sm leading-snug font-semibold text-navy hover:underline">
                      {d.text}
                    </Link>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{[d.owner, target].filter(Boolean).join(" · ")}</div>
                  </div>
                  {d.dueDate && (
                    <span className={`${pill} shrink-0 ${d.overdue ? TONE_PILL.bad : TONE_PILL.info}`}>
                      {d.overdue ? t("overdueOn", { date: formatDate(d.dueDate, locale) }) : t("dueOn", { date: formatDate(d.dueDate, locale) })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-1 flex items-center justify-between">
          <PanelLink href={`${basePath}/directives`}>{t("viewAll")}</PanelLink>
          {directives.overdue > 0 && (
            <Link href={`${basePath}/directives?tab=overdue`} className={`${pill} ${TONE_PILL.bad}`}>
              {t("overdueCount", { count: directives.overdue })}
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}
