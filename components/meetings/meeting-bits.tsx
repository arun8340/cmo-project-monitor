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
 * Numbered agenda. Linked projects, issues and directives show their current
 * status, and link through when the viewer may open them.
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
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white tabular-nums">
            {i.position}
          </span>
          {compact ? (
            <CompactItem item={i} basePath={basePath} />
          ) : (
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-semibold text-navy">{i.title}</p>
              {!compact && i.notes && (
                <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                  {i.notes}
                </p>
              )}
              {i.project && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderKanbanIcon className="size-3.5" />
                  <Ref
                    href={
                      i.project.linked
                        ? `${basePath}/project/${i.project.id}`
                        : null
                    }
                  >
                    {localName(locale, i.project.name, i.project.nameLocal)} ·{" "}
                    {localName(
                      locale,
                      i.project.district.name,
                      i.project.district.nameLocal,
                    )}
                  </Ref>
                  <StatusBadge status={i.project.status} />
                  {!compact && (
                    <span>
                      {t("progress", { percent: i.project.progressPercent })}
                    </span>
                  )}
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
                  {!compact && <PriorityBadge priority={i.issue.priority} />}
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
                    overdue={
                      !!i.directive.dueDate &&
                      i.directive.dueDate < new Date() &&
                      (i.directive.status === "OPEN" ||
                        i.directive.status === "IN_PROGRESS")
                    }
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

/** Home-page preview: the point (linking to what it is about) and that item's current status. */
function CompactItem({
  item: i,
  basePath,
}: {
  item: AgendaItemView;
  basePath: string;
}) {
  const href = i.project?.linked
    ? `${basePath}/project/${i.project.id}`
    : i.issue?.linked
      ? `${basePath}/issues/${i.issue.id}`
      : i.directive?.linked
        ? `${basePath}/directives/${i.directive.id}`
        : null;
  const badge = i.project ? (
    <StatusBadge status={i.project.status} />
  ) : i.issue ? (
    <IssueStatusBadge status={i.issue.status} />
  ) : i.directive ? (
    <DirectiveStatusBadge
      status={i.directive.status}
      overdue={
        !!i.directive.dueDate &&
        i.directive.dueDate < new Date() &&
        (i.directive.status === "OPEN" || i.directive.status === "IN_PROGRESS")
      }
    />
  ) : null;
  return (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
      {href ? (
        <Link
          href={href}
          className="text-sm leading-snug font-semibold text-navy hover:underline"
        >
          {i.title}
        </Link>
      ) : (
        <p className="text-sm leading-snug font-semibold text-navy">
          {i.title}
        </p>
      )}
      {badge && <span className="shrink-0">{badge}</span>}
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
