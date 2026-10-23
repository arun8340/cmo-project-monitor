import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CircleAlertIcon,
  FolderKanbanIcon,
  ScrollTextIcon,
} from "lucide-react";
import {
  DirectiveStatusBadge,
  IssueStatusBadge,
  pill,
  PriorityBadge,
  TONE_PILL,
} from "@/components/workflow/badges";
import { StatusBadge } from "@/components/project/status-badge";
import type { MeetingStatus } from "@/lib/constants";
import type { AgendaItemView } from "@/lib/data/meetings";
import { formatDate } from "@/lib/format";
import { localName } from "@/lib/i18n/names";
import { intlLocale, type Locale } from "@/lib/i18n/config";

const STATUS_STYLE: Record<MeetingStatus, string> = {
  DRAFT: TONE_PILL.warn,
  PUBLISHED: TONE_PILL.ok,
  CANCELLED: TONE_PILL.muted,
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const t = useTranslations("enums.meetingStatus");
  return <span className={`${pill} ${STATUS_STYLE[status]}`}>{t(status)}</span>;
}

/** "Thu, 29 Oct 2026 · 11:00 am" in IST. */
export function formatMeetingTime(d: Date, locale: string) {
  const loc = intlLocale(locale as Locale);
  const date = d.toLocaleDateString(loc, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const time = d.toLocaleTimeString(loc, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${date} · ${time}`;
}

/**
 * Numbered agenda. Each point shows the project it is about (opening the
 * project), and any linked issue or directive with its current status. Links
 * only appear for what the viewer may open.
 */
export function AgendaList({
  items,
  basePath,
  compact = false,
}: {
  items: AgendaItemView[];
  basePath: string;
  compact?: boolean;
}) {
  const t = useTranslations("meetings");
  const locale = useLocale();
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">{t("noItems")}</p>;
  return (
    <ol className="divide-y border-t">
      {items.map((i) => (
        <li
          key={i.id}
          className={`flex gap-3 ${compact ? "py-2.5" : "py-3.5"}`}
        >
          <span
            className={`grid shrink-0 place-items-center rounded-full bg-navy font-bold text-white tabular-nums ${compact ? "size-6 text-[11px]" : "size-7 text-xs"}`}
          >
            {i.position}
          </span>
          {compact ? (
            <CompactItem item={i} basePath={basePath} />
          ) : (
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-semibold text-navy">{i.title}</p>
              {i.notes && (
                <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                  {i.notes}
                </p>
              )}
              {i.about && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px]">
                  <ProjectLink project={i.about} basePath={basePath} />
                  <span className="text-muted-foreground">
                    ·{" "}
                    {localName(
                      locale,
                      i.about.district.name,
                      i.about.district.nameLocal,
                    )}
                  </span>
                  <StatusBadge status={i.about.status} />
                  <span className="text-xs text-muted-foreground">
                    {t("progress", { percent: i.about.progressPercent })}
                  </span>
                </div>
              )}
              {i.issue && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <CircleAlertIcon className="size-3.5" />
                  <Ref
                    href={
                      i.issue.linked ? `${basePath}/issues/${i.issue.id}` : null
                    }
                  >
                    {i.issue.title}
                  </Ref>
                  <IssueStatusBadge status={i.issue.status} />
                  <PriorityBadge priority={i.issue.priority} />
                </div>
              )}
              {i.directive && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <ScrollTextIcon className="size-3.5" />
                  <Ref
                    href={
                      i.directive.linked
                        ? `${basePath}/directives/${i.directive.id}`
                        : null
                    }
                  >
                    {t("directiveRef")}
                  </Ref>
                  <DirectiveStatusBadge
                    status={i.directive.status}
                    overdue={isOverdue(i.directive)}
                  />
                  {i.directive.dueDate && (
                    <span>
                      {t("due", {
                        date: formatDate(i.directive.dueDate, locale),
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

const isOverdue = (d: { dueDate: Date | null; status: string }) =>
  !!d.dueDate &&
  d.dueDate < new Date() &&
  (d.status === "OPEN" || d.status === "IN_PROGRESS");

/** The project name, opening the project (plain text if the viewer can't open it). */
function ProjectLink({
  project,
  basePath,
}: {
  project: NonNullable<AgendaItemView["about"]>;
  basePath: string;
}) {
  const locale = useLocale();
  const name = localName(locale, project.name, project.nameLocal);
  const body = (
    <>
      <FolderKanbanIcon className="size-3.5 shrink-0" />
      {name}
    </>
  );
  return project.linked ? (
    <Link
      href={`${basePath}/project/${project.id}`}
      className="inline-flex items-center gap-1 font-semibold text-link hover:underline"
    >
      {body}
    </Link>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
      {body}
    </span>
  );
}

/** Home-page preview: the point, its status, and the project it is about (link). */
function CompactItem({
  item: i,
  basePath,
}: {
  item: AgendaItemView;
  basePath: string;
}) {
  const badge = i.issue ? (
    <IssueStatusBadge status={i.issue.status} />
  ) : i.directive ? (
    <DirectiveStatusBadge
      status={i.directive.status}
      overdue={isOverdue(i.directive)}
    />
  ) : i.about ? (
    <StatusBadge status={i.about.status} />
  ) : null;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-snug font-semibold text-navy">
          {i.title}
        </p>
        {badge && <span className="shrink-0">{badge}</span>}
      </div>
      {i.about && (
        <div className="mt-0.5 text-xs">
          <ProjectLink project={i.about} basePath={basePath} />
        </div>
      )}
    </div>
  );
}

function Ref({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  return href ? (
    <Link href={href} className="font-semibold text-link hover:underline">
      {children}
    </Link>
  ) : (
    <span className="font-semibold text-foreground/80">{children}</span>
  );
}
