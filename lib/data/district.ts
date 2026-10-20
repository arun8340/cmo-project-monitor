import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope, issueScope, projectScope } from "@/lib/auth/scope";
import { classifyHealth, EMPTY_COUNTS, type Health, type StatusCounts } from "@/lib/district-health";
import { geoCodeFromSlug } from "@/lib/district-slug";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { behindBy, plannedPercent } from "@/lib/progress";
import { SORTS, type SortKey } from "./sorts";

const COUNT_KEY: Record<ProjectStatus, keyof Omit<StatusCounts, "total">> = {
  NOT_STARTED: "notStarted",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  DELAYED: "delayed",
  STALLED: "stalled",
};
const OPEN_ISSUE = { in: ["PENDING", "IN_PROGRESS"] };
const OPEN_DIRECTIVE = { in: ["OPEN", "IN_PROGRESS"] };
import { DEPT_ORDER } from "@/lib/departments";

function addCount(c: StatusCounts, status: string, n: number) {
  const key = COUNT_KEY[status as ProjectStatus];
  if (key) c[key] += n;
  c.total += n;
}

/** The district for a URL slug, if it exists and the user may open it. */
export async function findAccessibleDistrict(user: CurrentUser, state: StateConfig, slug: string) {
  return db.district.findFirst({
    where: { AND: [districtScope(user, state.code), { geoCode: geoCodeFromSlug(state.code, slug) }] },
  });
}

export type DepartmentCard = {
  code: string;
  slug: string;
  name: string;
  nameLocal: string;
  counts: StatusCounts;
  health: Health;
  /** Total sanctioned budget of the department's projects in view (₹ lakh). */
  budgetLakhs: number;
};

export type ProjectPin = {
  id: string;
  name: string;
  nameLocal: string | null;
  latitude: number;
  longitude: number;
  status: ProjectStatus;
  progressPercent: number;
  departmentCode: string;
  departmentName: string;
  departmentNameLocal: string | null;
};

export async function getDistrictView(user: CurrentUser, state: StateConfig, slug: string) {
  const district = await findAccessibleDistrict(user, state, slug);
  if (!district) return null;

  const pWhere: Prisma.ProjectWhereInput = { AND: [projectScope(user, state.code), { districtId: district.id }] };
  const [departments, grouped, budgets, collector, pins, openIssues, openDirectives] = await Promise.all([
    db.department.findMany({ where: departmentScope(user, state.code) }),
    db.project.groupBy({ by: ["departmentId", "status"], where: pWhere, _count: true }),
    db.project.groupBy({ by: ["departmentId"], where: pWhere, _sum: { budgetLakhs: true } }),
    db.user.findFirst({ where: { active: true, districtId: district.id, role: { key: "DISTRICT_COLLECTOR" } }, select: { name: true } }),
    db.project.findMany({
      where: pWhere,
      select: {
        id: true,
        name: true,
        nameLocal: true,
        latitude: true,
        longitude: true,
        status: true,
        progressPercent: true,
        department: { select: { code: true, name: true, nameLocal: true } },
      },
    }),
    db.issue.count({ where: { AND: [issueScope(user, state.code), { project: { districtId: district.id } }, { status: OPEN_ISSUE }] } }),
    db.directive.count({
      where: {
        AND: [
          directiveScope(user, state.code),
          { OR: [{ districtId: district.id }, { project: { districtId: district.id } }] },
          { status: OPEN_DIRECTIVE },
        ],
      },
    }),
  ]);

  const totals: StatusCounts = { ...EMPTY_COUNTS };
  const byDept = new Map<string, StatusCounts>();
  for (const row of grouped) {
    const c = byDept.get(row.departmentId) ?? { ...EMPTY_COUNTS };
    addCount(c, row.status, row._count);
    addCount(totals, row.status, row._count);
    byDept.set(row.departmentId, c);
  }

  const budgetByDept = new Map(budgets.map((b) => [b.departmentId, b._sum.budgetLakhs ?? 0]));
  const cards: DepartmentCard[] = departments
    .sort((a, b) => DEPT_ORDER.indexOf(a.code) - DEPT_ORDER.indexOf(b.code))
    .map((d) => {
      const counts = byDept.get(d.id) ?? { ...EMPTY_COUNTS };
      return {
        code: d.code,
        slug: d.code.toLowerCase(),
        name: d.name,
        nameLocal: d.nameLocal,
        counts,
        health: classifyHealth(counts),
        budgetLakhs: budgetByDept.get(d.id) ?? 0,
      };
    });

  return {
    district,
    collector: collector?.name ?? null,
    totals,
    health: classifyHealth(totals),
    openIssues,
    openDirectives,
    departments: cards,
    pins: pins.map((p) => ({
      id: p.id,
      name: p.name,
      nameLocal: p.nameLocal,
      latitude: p.latitude,
      longitude: p.longitude,
      status: p.status as ProjectStatus,
      progressPercent: p.progressPercent,
      departmentCode: p.department.code,
      departmentName: p.department.name,
      departmentNameLocal: p.department.nameLocal,
    })) satisfies ProjectPin[],
  };
}


export type ProjectRow = {
  id: string;
  name: string;
  nameLocal: string | null;
  latitude: number;
  longitude: number;
  departmentCode: string;
  departmentName: string;
  departmentNameLocal: string | null;
  status: ProjectStatus;
  progressPercent: number;
  plannedPercent: number | null;
  behind: number;
  budgetLakhs: number | null;
  startDate: Date | null;
  plannedEndDate: Date | null;
  latestImagery: Date | null;
  openIssues: number;
};

type ListOptions = { status?: string; q?: string; sort?: string };

/**
 * Projects of one department (or "all") in a district, filtered and sorted.
 * Returns null if the district or department is outside the user's scope.
 */
export async function getProjectList(user: CurrentUser, state: StateConfig, districtSlug: string, deptSlug: string, opts: ListOptions) {
  const district = await findAccessibleDistrict(user, state, districtSlug);
  if (!district) return null;

  let department: { id: string; code: string; name: string; nameLocal: string } | null = null;
  if (deptSlug !== "all") {
    department = await db.department.findFirst({
      where: { AND: [departmentScope(user, state.code), { code: deptSlug.toUpperCase() }] },
      select: { id: true, code: true, name: true, nameLocal: true },
    });
    if (!department) return null;
  }

  const q = opts.q?.trim().slice(0, 100) ?? "";
  const status = PROJECT_STATUSES.find((s) => s === opts.status?.toUpperCase()) ?? null;
  const sort: SortKey = opts.sort && opts.sort in SORTS ? (opts.sort as SortKey) : "behind";

  const base: Prisma.ProjectWhereInput[] = [projectScope(user, state.code), { districtId: district.id }];
  if (department) base.push({ departmentId: department.id });
  if (q) base.push({ OR: [{ name: { contains: q } }, { nameLocal: { contains: q } }] });

  const [statusGroups, projects] = await Promise.all([
    // Chip counts reflect the search but not the status filter.
    db.project.groupBy({ by: ["status"], where: { AND: base }, _count: true }),
    db.project.findMany({
      where: { AND: [...base, ...(status ? [{ status }] : [])] },
      include: {
        department: { select: { code: true, name: true, nameLocal: true } },
        imagery: { select: { captureDate: true }, orderBy: { captureDate: "desc" }, take: 1 },
        _count: { select: { issues: { where: { status: OPEN_ISSUE } } } },
      },
    }),
  ]);

  const counts: StatusCounts = { ...EMPTY_COUNTS };
  for (const g of statusGroups) addCount(counts, g.status, g._count);

  const now = new Date();
  const rows: ProjectRow[] = projects.map((p) => {
    const planned = plannedPercent(p.startDate, p.plannedEndDate, now);
    return {
      id: p.id,
      name: p.name,
      nameLocal: p.nameLocal,
      latitude: p.latitude,
      longitude: p.longitude,
      departmentCode: p.department.code,
      departmentName: p.department.name,
      departmentNameLocal: p.department.nameLocal,
      status: p.status as ProjectStatus,
      progressPercent: p.progressPercent,
      plannedPercent: planned,
      behind: behindBy(p.status as ProjectStatus, p.progressPercent, planned),
      budgetLakhs: p.budgetLakhs,
      startDate: p.startDate,
      plannedEndDate: p.plannedEndDate,
      latestImagery: p.imagery[0]?.captureDate ?? null,
      openIssues: p._count.issues,
    };
  });

  const byName = (a: ProjectRow, b: ProjectRow) => a.name.localeCompare(b.name);
  const severity: Record<ProjectStatus, number> = { STALLED: 0, DELAYED: 1, ONGOING: 2, NOT_STARTED: 3, COMPLETED: 4 };
  const comparators: Record<SortKey, (a: ProjectRow, b: ProjectRow) => number> = {
    behind: (a, b) => b.behind - a.behind || severity[a.status] - severity[b.status] || byName(a, b),
    name: byName,
    progress: (a, b) => b.progressPercent - a.progressPercent || byName(a, b),
    budget: (a, b) => (b.budgetLakhs ?? 0) - (a.budgetLakhs ?? 0) || byName(a, b),
    end: (a, b) => (a.plannedEndDate?.getTime() ?? Infinity) - (b.plannedEndDate?.getTime() ?? Infinity) || byName(a, b),
  };
  rows.sort(comparators[sort]);

  return { district, department, counts, rows, filters: { q, status, sort } };
}
