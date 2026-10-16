import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope, issueScope, projectScope } from "@/lib/auth/scope";
import { classifyHealth, EMPTY_COUNTS, type Health, type StatusCounts } from "@/lib/district-health";
import { districtSlug } from "@/lib/district-slug";
import type { ProjectStatus } from "@/lib/constants";

export type DistrictSummary = {
  geoCode: string;
  slug: string;
  name: string;
  nameLocal: string;
  accessible: boolean;
  counts: StatusCounts;
  health: Health;
};

export type DepartmentChip = { code: string; name: string; nameLocal: string; projects: number };

export type StateOverview = {
  department: DepartmentChip | null;
  departments: DepartmentChip[];
  totals: StatusCounts;
  districts: DistrictSummary[];
  issues: { lastMeetingDate: Date | null; pendingAtLastMeeting: number; resolvedAtLastMeeting: number; openTotal: number };
  directives: { open: number; overdue: number };
};

const COUNT_KEY: Record<ProjectStatus, keyof Omit<StatusCounts, "total">> = {
  NOT_STARTED: "notStarted",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  DELAYED: "delayed",
  STALLED: "stalled",
};

const OPEN_ISSUE = { in: ["PENDING", "IN_PROGRESS"] };
const OPEN_DIRECTIVE = { in: ["OPEN", "IN_PROGRESS"] };
const DAY = 86_400_000;

/**
 * Everything the state home needs, restricted to the user's scope and
 * optionally to one department (`deptCode`, e.g. "pwd").
 */
export async function getStateOverview(user: CurrentUser, state: StateConfig, deptCode?: string): Promise<StateOverview> {
  const code = state.code;
  const pScope = projectScope(user, code);

  // Department chips (only departments the user may see), with scoped project counts.
  const [deptRows, deptProjectCounts] = await Promise.all([
    db.department.findMany({ where: departmentScope(user, code), orderBy: { name: "asc" } }),
    db.project.groupBy({ by: ["departmentId"], where: pScope, _count: true }),
  ]);
  const countByDept = new Map(deptProjectCounts.map((r) => [r.departmentId, r._count]));
  const ORDER = ["PWD", "METRO", "DRAINAGE", "URBAN", "RNB", "RURAL", "MGNREGA"];
  deptRows.sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code));
  const departments = deptRows.map((d) => ({ code: d.code, name: d.name, nameLocal: d.nameLocal, projects: countByDept.get(d.id) ?? 0 }));

  const selected = deptCode ? deptRows.find((d) => d.code === deptCode.toUpperCase()) : undefined;
  const department = selected ? departments.find((d) => d.code === selected.code)! : null;

  const projectWhere: Prisma.ProjectWhereInput = selected ? { AND: [pScope, { departmentId: selected.id }] } : pScope;
  const issueWhere: Prisma.IssueWhereInput = selected
    ? { AND: [issueScope(user, code), { project: { departmentId: selected.id } }] }
    : issueScope(user, code);
  const directiveWhere: Prisma.DirectiveWhereInput = selected
    ? { AND: [directiveScope(user, code), { OR: [{ departmentId: selected.id }, { project: { departmentId: selected.id } }] }] }
    : directiveScope(user, code);

  const now = new Date();
  const [districtRows, accessibleRows, grouped, lastMeeting, openIssues, openDirectives, overdueDirectives] = await Promise.all([
    db.district.findMany({ where: { state: { code } }, orderBy: { name: "asc" } }),
    db.district.findMany({ where: districtScope(user, code), select: { id: true } }),
    db.project.groupBy({ by: ["districtId", "status"], where: projectWhere, _count: true }),
    // The meeting date itself is state-wide (same for everyone); counts below are scoped.
    db.issue.aggregate({
      where: { project: { district: { state: { code } } }, meetingDate: { lte: now } },
      _max: { meetingDate: true },
    }),
    db.issue.count({ where: { AND: [issueWhere, { status: OPEN_ISSUE }] } }),
    db.directive.count({ where: { AND: [directiveWhere, { status: OPEN_DIRECTIVE }] } }),
    db.directive.count({ where: { AND: [directiveWhere, { status: OPEN_DIRECTIVE }, { dueDate: { lt: now } }] } }),
  ]);

  // "Pending issues of last meeting": raised at or before the last review
  // meeting and still open. "Resolved": closed on the day of that meeting.
  // (Refine once a Meeting model exists — see PROJECT_BRIEF §8.)
  const lastMeetingDate = lastMeeting._max.meetingDate;
  let pendingAtLastMeeting = 0;
  let resolvedAtLastMeeting = 0;
  if (lastMeetingDate) {
    const dayStart = new Date(lastMeetingDate);
    dayStart.setHours(0, 0, 0, 0);
    [pendingAtLastMeeting, resolvedAtLastMeeting] = await Promise.all([
      db.issue.count({ where: { AND: [issueWhere, { status: OPEN_ISSUE, meetingDate: { lte: lastMeetingDate } }] } }),
      db.issue.count({
        where: { AND: [issueWhere, { status: "RESOLVED", resolvedAt: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY) } }] },
      }),
    ]);
  }

  const accessible = new Set(accessibleRows.map((r) => r.id));
  const countsByDistrict = new Map<string, StatusCounts>();
  const totals: StatusCounts = { ...EMPTY_COUNTS };
  for (const row of grouped) {
    const c = countsByDistrict.get(row.districtId) ?? { ...EMPTY_COUNTS };
    const key = COUNT_KEY[row.status as ProjectStatus];
    if (key) {
      c[key] += row._count;
      totals[key] += row._count;
    }
    c.total += row._count;
    totals.total += row._count;
    countsByDistrict.set(row.districtId, c);
  }

  const districts = districtRows.map((d) => {
    const counts = countsByDistrict.get(d.id) ?? { ...EMPTY_COUNTS };
    return {
      geoCode: d.geoCode,
      slug: districtSlug(d.geoCode),
      name: d.name,
      nameLocal: d.nameLocal,
      accessible: accessible.has(d.id),
      counts,
      health: classifyHealth(counts),
    };
  });

  return {
    department,
    departments,
    totals,
    districts,
    issues: { lastMeetingDate, pendingAtLastMeeting, resolvedAtLastMeeting, openTotal: openIssues },
    directives: { open: openDirectives, overdue: overdueDirectives },
  };
}
