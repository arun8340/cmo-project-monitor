import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Panel, PanelLink } from "@/components/app-shell/page-parts";
import { pill, TONE_PILL } from "@/components/workflow/badges";
import type { StateOverview } from "@/lib/data/state-overview";
import { formatDate } from "@/lib/format";
import { localName } from "@/lib/i18n/names";
import {
  AgendaList,
  formatMeetingTime,
  MeetingStatusBadge,
} from "@/components/meetings/meeting-bits";
import type { NextMeeting } from "@/lib/data/meetings";
import { CalendarDaysIcon, MapPinIcon, PlusIcon } from "lucide-react";

/**
 * The headline numbers as a compact card at the top of the side column, over
 * satellite imagery. Every figure opens the matching list (Projects, Issues,
 * Live Imagery).
 */
function AtAGlance({
  overview,
  basePath,
}: {
  overview: StateOverview;
  basePath: string;
}) {
  const t = useTranslations("kpi");
  const { totals, issues } = overview;
  const projects = (status?: string) =>
    `${basePath}/projects${status ? `?status=${status}` : ""}`;
  const items: { label: string; value: number; href: string; tone: string }[] =
    [
      {
        label: t("totalProjects"),
        value: totals.total,
        href: projects(),
        tone: "text-white",
      },
      {
        label: t("completed"),
        value: totals.completed,
        href: projects("completed"),
        tone: "text-[#8fe0b0]",
      },
      {
        label: t("ongoing"),
        value: totals.ongoing,
        href: projects("ongoing"),
        tone: "text-[#9cc8f5]",
      },
      {
        label: t("delayedStalled"),
        value: totals.delayed + totals.stalled,
        href: projects("delayed,stalled"),
        tone: "text-[#ffa58f]",
      },
      {
        label: t("openIssues"),
        value: issues.openTotal,
        href: `${basePath}/issues`,
        tone: "text-amber",
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
      <div aria-hidden className="absolute inset-0 bg-navy/85" />
      {/* Three per row; one row of five on wide screens. */}
      <ul className="relative grid grid-cols-3 [&>li]:border-white/15 [&>li:nth-child(n+4)]:border-t [&>li:not(:nth-child(3n+1))]:border-l xl:grid-cols-5 xl:[&>li:nth-child(4)]:border-l xl:[&>li:nth-child(n+4)]:border-t-0">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="block h-full px-3 py-3 transition-colors hover:bg-white/10"
            >
              <div
                className={`text-[24px] leading-none font-bold tracking-tight tabular-nums ${it.tone}`}
              >
                {it.value}
              </div>
              <div className="mt-1 text-[11px] leading-tight font-semibold text-white/85">
                {it.label}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Right-hand column beside the map: the figures at a glance, the next review
 * meeting and the previous one, with their agenda points.
 */
export function DashboardSide({
  overview,
  basePath,
  nextMeeting,
  previousMeeting,
  canManageMeetings,
}: {
  overview: StateOverview;
  basePath: string;
  nextMeeting: NextMeeting | null;
  previousMeeting: NextMeeting | null;
  canManageMeetings: boolean;
}) {
  return (
    <div className="grid content-start gap-4">
      <AtAGlance overview={overview} basePath={basePath} />
      {/* Next and last meeting side by side on wide screens. */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <NextMeetingPanel
          meeting={nextMeeting}
          basePath={basePath}
          canManage={canManageMeetings}
        />
        <PreviousMeetingPanel
          meeting={previousMeeting}
          overview={overview}
          basePath={basePath}
        />
      </div>
    </div>
  );
}

/** The last review meeting: its pending / resolved issue counts and the points discussed. */
function PreviousMeetingPanel({
  meeting,
  overview,
  basePath,
}: {
  meeting: NextMeeting | null;
  overview: StateOverview;
  basePath: string;
}) {
  const t = useTranslations("kpi");
  const tm = useTranslations("meetings");
  const locale = useLocale();
  const { issues } = overview;
  const date = meeting?.meetingAt ?? issues.lastMeetingDate;
  return (
    <Panel
      title={t("lastMeeting")}
      action={
        date && (
          <span className="text-sm text-muted-foreground">
            {formatDate(date, locale)}
          </span>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`${basePath}/issues`}
          className="rounded-lg bg-warn-soft px-3 py-2 transition hover:brightness-[0.98]"
        >
          <span className="text-[22px] leading-none font-bold text-warn">
            {issues.pendingAtLastMeeting}
          </span>
          <span className="ml-1.5 text-[13px] font-semibold text-warn">
            {t("pendingIssues")}
          </span>
        </Link>
        <Link
          href={`${basePath}/issues?status=resolved`}
          className="rounded-lg bg-ok-soft px-3 py-2 transition hover:brightness-[0.98]"
        >
          <span className="text-[22px] leading-none font-bold text-ok">
            {issues.resolvedAtLastMeeting}
          </span>
          <span className="ml-1.5 text-[13px] font-semibold text-ok">
            {t("resolvedIssues")}
          </span>
        </Link>
      </div>
      {meeting ? (
        <>
          <p className="mt-3 mb-1 text-[13px] font-semibold text-muted-foreground">
            {tm("pointsDiscussed", { count: meeting.items.length })}
          </p>
          <AgendaList
            items={meeting.items.slice(0, AGENDA_PREVIEW)}
            basePath={basePath}
            compact
          />
          <div className="mt-1">
            <PanelLink href={`${basePath}/meetings/${meeting.id}`}>
              {meeting.items.length > AGENDA_PREVIEW
                ? tm("viewFullAgendaMore", {
                    count: meeting.items.length - AGENDA_PREVIEW,
                  })
                : tm("viewFullAgenda")}
            </PanelLink>
          </div>
        </>
      ) : (
        !issues.lastMeetingDate && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t("noMeetings")}
          </p>
        )
      )}
    </Panel>
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

const AGENDA_PREVIEW = 7;

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
