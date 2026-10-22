import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Panel, PanelLink } from "@/components/app-shell/page-parts";
import {
  IssueStatusBadge,
  pill,
  TONE_PILL,
} from "@/components/workflow/badges";
import type { StateOverview } from "@/lib/data/state-overview";
import type { IssueStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { localName } from "@/lib/i18n/names";
import {
  AgendaList,
  formatMeetingTime,
  MeetingStatusBadge,
} from "@/components/meetings/meeting-bits";
import type { NextMeeting } from "@/lib/data/meetings";
import { CalendarDaysIcon, MapPinIcon, PlusIcon } from "lucide-react";

const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0;

/**
 * The headline numbers in one bar across the top of the state dashboard, over
 * satellite imagery. Every figure opens the matching list (Projects, Issues,
 * Imagery), keeping the department filter.
 */
export function KpiRow({
  overview,
  basePath,
}: {
  overview: StateOverview;
  basePath: string;
}) {
  const t = useTranslations("kpi");
  const { totals, issues } = overview;
  const dept = overview.department
    ? `dept=${overview.department.code.toLowerCase()}`
    : "";
  const projects = (status?: string) => {
    const qs = [status && `status=${status}`, dept].filter(Boolean).join("&");
    return `${basePath}/projects${qs ? `?${qs}` : ""}`;
  };
  const items: {
    label: string;
    value: number;
    hint: string;
    href: string;
    tone: string;
  }[] = [
    {
      label: t("totalProjects"),
      value: totals.total,
      hint: t("acrossDepartments", { count: overview.departments.length }),
      href: projects(),
      tone: "text-white",
    },
    {
      label: t("completed"),
      value: totals.completed,
      hint: t("ofTotal", { percent: pct(totals.completed, totals.total) }),
      href: projects("completed"),
      tone: "text-[#8fe0b0]",
    },
    {
      label: t("ongoing"),
      value: totals.ongoing,
      hint: t("ofTotal", { percent: pct(totals.ongoing, totals.total) }),
      href: projects("ongoing"),
      tone: "text-[#9cc8f5]",
    },
    {
      label: t("delayedStalled"),
      value: totals.delayed + totals.stalled,
      hint: t("behindSchedule"),
      href: projects("delayed,stalled"),
      tone: "text-[#ffa58f]",
    },
    {
      label: t("openIssues"),
      value: issues.openTotal,
      hint: issues.lastMeetingDate
        ? t("pendingAtMeeting", { count: issues.pendingAtLastMeeting })
        : t("noMeetings"),
      href: `${basePath}/issues`,
      tone: "text-amber",
    },
    {
      label: t("withImagery"),
      value: overview.withImagery,
      hint: t("withImageryHint"),
      href: `${basePath}/imagery${dept ? `?${dept}` : ""}`,
      tone: "text-white",
    },
  ];
  return (
    <section
      aria-label={t("summary")}
      className="relative overflow-hidden rounded-xl bg-navy text-white shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative background */}
      <img
        src="/landing/02.webp"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/82 to-navy/78"
      />
      <ul className="relative grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((it, i) => (
          <li
            key={it.label}
            className={`border-white/15 ${i > 0 ? "xl:border-l" : ""} ${i % 2 ? "border-l sm:border-l-0" : ""} ${i % 3 ? "sm:border-l" : ""}`}
          >
            <Link
              href={it.href}
              className="block h-full px-4 py-3.5 transition-colors [text-shadow:0_1px_2px_rgb(0_0_0/0.6)] hover:bg-white/10 sm:px-5 sm:py-4"
            >
              <div className="text-[13px] font-semibold text-white/90">
                {it.label}
              </div>
              <div
                className={`mt-1 text-[30px] leading-none font-bold tracking-tight tabular-nums ${it.tone}`}
              >
                {it.value}
              </div>
              <div className="mt-1.5 text-xs text-white/80">{it.hint}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Right-hand column beside the map: next review meeting and last review meeting. */
export function DashboardSide({
  overview,
  basePath,
  nextMeeting,
  canManageMeetings,
}: {
  overview: StateOverview;
  basePath: string;
  nextMeeting: NextMeeting | null;
  canManageMeetings: boolean;
}) {
  const t = useTranslations("kpi");
  const locale = useLocale();
  const ln = (n: { name: string; nameLocal: string | null } | null) =>
    n ? localName(locale, n.name, n.nameLocal) : "";
  const { issues, recentIssues } = overview;

  return (
    <div className="grid content-start gap-4">
      <NextMeetingPanel
        meeting={nextMeeting}
        basePath={basePath}
        canManage={canManageMeetings}
      />

      <Panel
        title={t("lastMeeting")}
        action={
          issues.lastMeetingDate && (
            <span className="text-sm text-muted-foreground">
              {formatDate(issues.lastMeetingDate, locale)}
            </span>
          )
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`${basePath}/issues`}
            className="rounded-lg bg-warn-soft p-3 transition hover:brightness-[0.98]"
          >
            <div className="text-[28px] leading-none font-bold text-warn">
              {issues.pendingAtLastMeeting}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold text-warn">
              {t("pendingIssues")}
            </div>
          </Link>
          <Link
            href={`${basePath}/issues?status=resolved`}
            className="rounded-lg bg-ok-soft p-3 transition hover:brightness-[0.98]"
          >
            <div className="text-[28px] leading-none font-bold text-ok">
              {issues.resolvedAtLastMeeting}
            </div>
            <div className="mt-1.5 text-[13px] font-semibold text-ok">
              {t("resolvedIssues")}
            </div>
          </Link>
        </div>
        {!issues.lastMeetingDate && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t("noMeetings")}
          </p>
        )}
        {recentIssues.length > 0 && (
          <ul className="mt-3 divide-y border-t">
            {recentIssues.slice(0, 2).map((i) => (
              <li key={i.id} className="py-2.5">
                <Link
                  href={`${basePath}/issues/${i.id}`}
                  className="text-sm leading-snug font-semibold text-navy hover:underline"
                >
                  {i.title} – {ln(i.project)}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
                  {ln(i.department)} · {ln(i.district)} ·{" "}
                  <IssueStatusBadge status={i.status as IssueStatus} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1">
          <PanelLink href={`${basePath}/issues`}>{t("viewAll")}</PanelLink>
        </div>
      </Panel>
    </div>
  );
}

/** Under the map: projects by department and the latest directives, side by side. */
export function DashboardBelow({
  overview,
  basePath,
}: {
  overview: StateOverview;
  basePath: string;
}) {
  const t = useTranslations("kpi");
  const locale = useLocale();
  const ln = (n: { name: string; nameLocal: string | null } | null) =>
    n ? localName(locale, n.name, n.nameLocal) : "";
  const { directives, recentDirectives } = overview;
  const maxDept = Math.max(1, ...overview.departments.map((d) => d.projects));
  const departments = [...overview.departments].sort(
    (a, b) => b.projects - a.projects,
  );

  return (
    <div
      className={`grid items-start gap-4 ${departments.length > 1 ? "lg:grid-cols-2" : ""}`}
    >
      {departments.length > 1 && (
        <Panel title={t("byDepartment")}>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {departments.map((d) => (
              <li key={d.code}>
                <Link
                  href={`${basePath || "/"}?dept=${d.code.toLowerCase()}`}
                  className="group block"
                  scroll={false}
                >
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="group-hover:underline">
                      {localName(locale, d.name, d.nameLocal)}
                    </span>
                    <span className="font-bold text-navy tabular-nums">
                      {d.projects}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-info"
                      style={{ width: `${(d.projects / maxDept) * 100}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t("directivesTitle")}>
        {recentDirectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noOpenDirectives")}
          </p>
        ) : (
          <ul className="divide-y border-t">
            {recentDirectives.map((d) => {
              const target = [ln(d.district), ln(d.department)]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`${basePath}/directives/${d.id}`}
                      className="line-clamp-2 text-sm leading-snug font-semibold text-navy hover:underline"
                    >
                      {d.text}
                    </Link>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">
                      {[d.owner, target].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {d.dueDate && (
                    <span
                      className={`${pill} shrink-0 ${d.overdue ? TONE_PILL.bad : TONE_PILL.info}`}
                    >
                      {d.overdue
                        ? t("overdueOn", {
                            date: formatDate(d.dueDate, locale),
                          })
                        : t("dueOn", { date: formatDate(d.dueDate, locale) })}
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
            <Link
              href={`${basePath}/directives?tab=overdue`}
              className={`${pill} ${TONE_PILL.bad}`}
            >
              {t("overdueCount", { count: directives.overdue })}
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}

const AGENDA_PREVIEW = 3;

/** The next CMO review meeting and the start of its published agenda. */
function NextMeetingPanel({
  meeting,
  basePath,
  canManage,
}: {
  meeting: NextMeeting | null;
  basePath: string;
  canManage: boolean;
}) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  if (!meeting) {
    return (
      <Panel title={t("nextMeeting")}>
        <p className="text-sm text-muted-foreground">{t("noneScheduled")}</p>
        <div className="mt-2 flex items-center justify-between">
          <PanelLink href={`${basePath}/meetings`}>
            {t("allMeetings")}
          </PanelLink>
          {canManage && (
            <Link
              href={`${basePath}/meetings/new`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
            >
              <PlusIcon className="size-4" />
              {t("schedule")}
            </Link>
          )}
        </div>
      </Panel>
    );
  }
  const href = `${basePath}/meetings/${meeting.id}`;
  return (
    <section className="overflow-hidden rounded-xl border-2 border-amber/70 bg-card shadow-sm">
      <div className="bg-navy px-5 py-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-wide text-amber uppercase">
            {t("nextMeeting")}
          </p>
          {meeting.status === "DRAFT" && (
            <MeetingStatusBadge status={meeting.status} />
          )}
        </div>
        <Link
          href={href}
          className="mt-1 block leading-snug font-bold hover:underline"
        >
          {meeting.title}
        </Link>
        <div className="mt-1.5 grid gap-0.5 text-[13px] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3.5" />
            {formatMeetingTime(meeting.meetingAt, locale)}
          </span>
          {meeting.venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" />
              {meeting.venue}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 pt-3 pb-4">
        <p className="mb-1 text-[13px] font-semibold text-muted-foreground">
          {t("agendaCount", { count: meeting.items.length })}
        </p>
        <AgendaList
          items={meeting.items.slice(0, AGENDA_PREVIEW)}
          basePath={basePath}
          compact
        />
        <div className="mt-1">
          <PanelLink href={href}>
            {meeting.items.length > AGENDA_PREVIEW
              ? t("viewFullAgendaMore", {
                  count: meeting.items.length - AGENDA_PREVIEW,
                })
              : t("viewFullAgenda")}
          </PanelLink>
        </div>
      </div>
    </section>
  );
}
