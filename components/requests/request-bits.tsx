import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClockIcon, ClockAlertIcon } from "lucide-react";
import { pill, PriorityBadge, TONE_PILL } from "@/components/workflow/badges";
import { SOURCE_META } from "@/components/imagery/source-meta";
import type { RequestStatus } from "@/lib/constants";
import type { RequestRow } from "@/lib/data/requests";
import { formatDate } from "@/lib/format";
import { localName } from "@/lib/i18n/names";

const STATUS_TONE: Record<RequestStatus, string> = {
  SUBMITTED: TONE_PILL.warn,
  UNDER_REVIEW: TONE_PILL.info,
  APPROVED: TONE_PILL.ok,
  ORDERED: TONE_PILL.info,
  DELIVERED: TONE_PILL.ok,
  CLOSED: TONE_PILL.muted,
  REJECTED: TONE_PILL.bad,
  CANCELLED: TONE_PILL.muted,
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations("enums.requestStatus");
  return <span className={`${pill} ${STATUS_TONE[status]}`}>{t(status)}</span>;
}

export function OverdueBadge() {
  const t = useTranslations("requests");
  return (
    <span className={`${pill} ${TONE_PILL.bad}`}>
      <ClockAlertIcon className="size-3" />
      {t("overdue")}
    </span>
  );
}

/** Satellite / Drone / Field photo with its icon. */
export function RequestType({ type }: { type: RequestRow["type"] }) {
  const t = useTranslations("enums.source");
  const meta = SOURCE_META[type];
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-navy">
      <meta.icon className="size-4" style={{ color: meta.color }} />
      {t(type)}
    </span>
  );
}

/** One request in a list: what, for which project, by whom, needed by when. */
export function RequestCard({
  r,
  basePath,
}: {
  r: RequestRow;
  basePath: string;
}) {
  const t = useTranslations("requests");
  const locale = useLocale();
  return (
    <li
      className={`rounded-xl border bg-card p-4 transition hover:shadow-sm ${r.overdue ? "border-bad/40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <RequestType type={r.type} />
        <RequestStatusBadge status={r.status} />
        <PriorityBadge priority={r.priority} />
        {r.overdue && <OverdueBadge />}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClockIcon className="size-3.5" />
          {t("neededBy", { date: formatDate(r.neededBy, locale) })}
        </span>
      </div>
      <Link
        href={`${basePath}/requests/${r.id}`}
        className="mt-2 block font-semibold text-navy hover:underline"
      >
        {localName(locale, r.project.name, r.project.nameLocal)}
      </Link>
      <p className="text-xs text-muted-foreground">
        {localName(
          locale,
          r.project.department.name,
          r.project.department.nameLocal,
        )}{" "}
        ·{" "}
        {localName(
          locale,
          r.project.district.name,
          r.project.district.nameLocal,
        )}
      </p>
      <p className="mt-2 line-clamp-2 text-sm">{r.purpose}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("requestedBy", {
          name: r.requestedBy.name,
          date: formatDate(r.createdAt, locale),
        })}
      </p>
    </li>
  );
}
