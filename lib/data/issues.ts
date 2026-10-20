import "server-only";
import { getLocale } from "next-intl/server";
import { localName } from "@/lib/i18n/names";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, districtScope, issueScope } from "@/lib/auth/scope";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, type IssuePriority, type IssueStatus } from "@/lib/constants";
import { districtSlug, geoCodeFromSlug } from "@/lib/district-slug";
import { parseDateInput, toDateInput } from "@/lib/dates";
import { OPEN_ISSUE_STATUSES } from "@/lib/workflow";

export type IssueFilters = {
  /** "open" (default), "all", or an IssueStatus in lower case */
  status: string;
  priority: IssuePriority | null;
  district: string | null; // slug
  dept: string | null; // code, lower case
  meeting: string | null; // YYYY-MM-DD
  q: string;
};

const PRIORITY_RANK: Record<IssuePriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function parseIssueFilters(sp: Record<string, string | string[] | undefined>): IssueFilters {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const status = str(sp.status)?.toLowerCase() ?? "open";
  const priority = ISSUE_PRIORITIES.find((p) => p === str(sp.priority)?.toUpperCase()) ?? null;
  return {
    status: status === "all" || status === "open" || ISSUE_STATUSES.some((s) => s.toLowerCase() === status) ? status : "open",
    priority,
    district: str(sp.district)?.toLowerCase() ?? null,
    dept: str(sp.dept)?.toLowerCase() ?? null,
    meeting: str(sp.meeting) && parseDateInput(str(sp.meeting)!) ? str(sp.meeting) : null,
    q: (str(sp.q) ?? "").trim().slice(0, 100),
  };
}

function statusWhere(status: string): Prisma.IssueWhereInput {
  if (status === "all") return {};
  if (status === "open") return { status: { in: OPEN_ISSUE_STATUSES } };
  return { status: status.toUpperCase() };
}

/** Issues visible to the user in this state, filtered, plus filter options and counts. */
export async function listIssues(user: CurrentUser, state: StateConfig, f: IssueFilters) {
  const base: Prisma.IssueWhereInput[] = [issueScope(user, state.code)];
  if (f.priority) base.push({ priority: f.priority });
  if (f.district) base.push({ project: { district: { geoCode: geoCodeFromSlug(state.code, f.district) } } });
  if (f.dept) base.push({ project: { department: { code: f.dept.toUpperCase() } } });
  if (f.meeting) {
    const day = parseDateInput(f.meeting)!;
    base.push({ meetingDate: { gte: day, lt: new Date(day.getTime() + 86_400_000) } });
  }
  if (f.q) base.push({ OR: [{ title: { contains: f.q } }, { description: { contains: f.q } }, { project: { name: { contains: f.q } } }] });

  const [byStatus, rows, meetings, districts, departments, locale] = await Promise.all([
    db.issue.groupBy({ by: ["status"], where: { AND: base }, _count: true }),
    db.issue.findMany({
      where: { AND: [...base, statusWhere(f.status)] },
      include: {
        createdBy: { select: { name: true } },
        project: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            district: { select: { name: true, nameLocal: true, geoCode: true } },
            department: { select: { name: true, nameLocal: true, code: true } },
          },
        },
      },
      take: 500,
    }),
    db.issue.findMany({
      where: { AND: [issueScope(user, state.code), { meetingDate: { not: null } }] },
      select: { meetingDate: true },
      distinct: ["meetingDate"],
      orderBy: { meetingDate: "desc" },
    }),
    db.district.findMany({ where: districtScope(user, state.code), orderBy: { name: "asc" }, select: { name: true, nameLocal: true, geoCode: true } }),
    db.department.findMany({ where: departmentScope(user, state.code), select: { name: true, nameLocal: true, code: true } }),
    getLocale(),
  ]);
  const ln = (n: { name: string; nameLocal: string | null }) => localName(locale, n.name, n.nameLocal);

  const counts = Object.fromEntries(ISSUE_STATUSES.map((s) => [s, 0])) as Record<IssueStatus, number>;
  for (const g of byStatus) counts[g.status as IssueStatus] = g._count;

  // Most urgent first: open before closed, then priority, then oldest.
  const open = (s: string) => (OPEN_ISSUE_STATUSES as string[]).includes(s);
  rows.sort(
    (a, b) =>
      Number(open(b.status)) - Number(open(a.status)) ||
      PRIORITY_RANK[a.priority as IssuePriority] - PRIORITY_RANK[b.priority as IssuePriority] ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const meetingDays = [...new Set(meetings.map((m) => toDateInput(m.meetingDate)))];
  return {
    rows: rows.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status as IssueStatus,
      priority: i.priority as IssuePriority,
      meetingDate: i.meetingDate,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
      raisedBy: i.createdBy?.name ?? null,
      project: { id: i.project.id, name: ln(i.project) },
      district: ln(i.project.district),
      department: ln(i.project.department),
    })),
    counts,
    openCount: counts.PENDING + counts.IN_PROGRESS,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    options: {
      meetings: meetingDays,
      districts: districts.map((d) => ({ slug: districtSlug(d.geoCode), name: ln(d) })),
      departments: departments.map((d) => ({ code: d.code.toLowerCase(), name: ln(d) })),
    },
  };
}

/** One issue with its history, if inside the user's scope. */
export async function getIssue(user: CurrentUser, state: StateConfig, id: string) {
  return db.issue.findFirst({
    where: { AND: [{ id }, issueScope(user, state.code)] },
    include: {
      createdBy: { select: { name: true } },
      project: { include: { district: true, department: true } },
      updates: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
    },
  });
}
