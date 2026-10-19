import { ClockAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DirectiveStatus, IssuePriority, IssueStatus } from "@/lib/constants";

/** Soft pill: tinted background, dark text of the same hue (always a text label, never colour alone). */
export const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold";

export const TONE_PILL = {
  ok: "bg-ok-soft text-ok",
  info: "bg-info-soft text-info",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  stall: "bg-stall-soft text-stall",
  muted: "bg-muted text-muted-foreground",
} as const;

export const PRIORITY_STYLE: Record<IssuePriority, string> = {
  CRITICAL: TONE_PILL.bad,
  HIGH: TONE_PILL.warn,
  MEDIUM: TONE_PILL.info,
  LOW: TONE_PILL.muted,
};

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const t = useTranslations("enums.priority");
  return <span className={`${pill} ${PRIORITY_STYLE[priority]}`}>{t(priority)}</span>;
}

const ISSUE_STYLE: Record<IssueStatus, string> = {
  PENDING: TONE_PILL.warn,
  IN_PROGRESS: TONE_PILL.info,
  RESOLVED: TONE_PILL.ok,
  ARCHIVED: TONE_PILL.muted,
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const t = useTranslations("enums.issueStatus");
  return <span className={`${pill} ${ISSUE_STYLE[status]}`}>{t(status)}</span>;
}

const DIRECTIVE_STYLE: Record<DirectiveStatus, string> = {
  OPEN: TONE_PILL.warn,
  IN_PROGRESS: TONE_PILL.info,
  COMPLIED: TONE_PILL.ok,
  CLOSED: TONE_PILL.muted,
};

export function DirectiveStatusBadge({ status, overdue }: { status: DirectiveStatus; overdue?: boolean }) {
  const t = useTranslations("enums.directiveStatus");
  const tw = useTranslations("workflow");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${pill} ${DIRECTIVE_STYLE[status]}`}>{t(status)}</span>
      {overdue && (
        <span className={`${pill} ${TONE_PILL.bad}`}>
          <ClockAlertIcon className="size-3" />
          {tw("overdue")}
        </span>
      )}
    </span>
  );
}
