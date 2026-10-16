import { ArchiveIcon, CircleCheckIcon, CircleDotIcon, CircleIcon, ClockAlertIcon, LockIcon } from "lucide-react";
import {
  DIRECTIVE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  type DirectiveStatus,
  type IssuePriority,
  type IssueStatus,
} from "@/lib/constants";

const base = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium";

export const PRIORITY_STYLE: Record<IssuePriority, string> = {
  CRITICAL: "border-red-300 bg-red-50 text-red-800",
  HIGH: "border-orange-300 bg-orange-50 text-orange-800",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-800",
  LOW: "border-slate-300 bg-slate-50 text-slate-700",
};

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return <span className={`${base} ${PRIORITY_STYLE[priority]}`}>{ISSUE_PRIORITY_LABELS[priority]}</span>;
}

const ISSUE_ICON: Record<IssueStatus, { icon: typeof CircleIcon; className: string }> = {
  PENDING: { icon: CircleIcon, className: "text-amber-700" },
  IN_PROGRESS: { icon: CircleDotIcon, className: "text-blue-700" },
  RESOLVED: { icon: CircleCheckIcon, className: "text-green-700" },
  ARCHIVED: { icon: ArchiveIcon, className: "text-slate-500" },
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const { icon: Icon, className } = ISSUE_ICON[status];
  return (
    <span className={`${base} bg-background`}>
      <Icon className={`size-3 ${className}`} />
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}

const DIRECTIVE_ICON: Record<DirectiveStatus, { icon: typeof CircleIcon; className: string }> = {
  OPEN: { icon: CircleIcon, className: "text-amber-700" },
  IN_PROGRESS: { icon: CircleDotIcon, className: "text-blue-700" },
  COMPLIED: { icon: CircleCheckIcon, className: "text-green-700" },
  CLOSED: { icon: LockIcon, className: "text-slate-500" },
};

export function DirectiveStatusBadge({ status, overdue }: { status: DirectiveStatus; overdue?: boolean }) {
  const { icon: Icon, className } = DIRECTIVE_ICON[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${base} bg-background`}>
        <Icon className={`size-3 ${className}`} />
        {DIRECTIVE_STATUS_LABELS[status]}
      </span>
      {overdue && (
        <span className={`${base} border-red-300 bg-red-50 text-red-800`}>
          <ClockAlertIcon className="size-3" />
          Overdue
        </span>
      )}
    </span>
  );
}

