import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, districtScope, projectScope } from "@/lib/auth/scope";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { DEPT_ORDER } from "@/lib/departments";
import { districtSlug, geoCodeFromSlug } from "@/lib/district-slug";
import {
  countByStatus,
  parseSort,
  ROW_INCLUDE,
  sortRows,
  toRow,
} from "./district";
import {
  classifyHealth,
  EMPTY_COUNTS,
  type StatusCounts,
} from "@/lib/district-health";

const str = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

/**
 * Filters shared by the state-wide Projects and Imagery pages, from the URL:
 * ?status=delayed,stalled&district=jaipur&dept=pwd&q=…&sort=…
 */
export type ProjectFilters = {
  statuses: ProjectStatus[];
  district: string | null;
  dept: string | null;
  q: string;
  sort: ReturnType<typeof parseSort>;
};

export function parseProjectFilters(
  sp: Record<string, string | string[] | undefined>,
): ProjectFilters {
  const wanted = (str(sp.status) ?? "").toUpperCase().split(",");
  return {
    statuses: PROJECT_STATUSES.filter((s) => wanted.includes(s)),
    district: str(sp.district)?.toLowerCase() || null,
    dept: str(sp.dept)?.toLowerCase() || null,
    q: (str(sp.q) ?? "").trim().slice(0, 100),
    sort: parseSort(str(sp.sort)),
  };
}

/** Query string for the filters, with `change` applied (undefined = keep). */
export function filtersQuery(
  f: ProjectFilters,
  change: Partial<
    Record<"status" | "district" | "dept" | "q", string | null>
  > = {},
) {
  const qs = new URLSearchParams();
  const status =
    change.status !== undefined
      ? change.status
      : f.statuses.map((s) => s.toLowerCase()).join(",") || null;
  const district = change.district !== undefined ? change.district : f.district;
  const dept = change.dept !== undefined ? change.dept : f.dept;
  const q = change.q !== undefined ? change.q : f.q;
  if (status) qs.set("status", status);
  if (district) qs.set("district", district);
  if (dept) qs.set("dept", dept);
  if (q) qs.set("q", q);
  if (f.sort !== "behind") qs.set("sort", f.sort);
  return qs.size ? `?${qs}` : "";
}

/** Districts and departments the user may filter by (each with a URL slug). */
async function filterOptions(user: CurrentUser, state: StateConfig) {
  const [districts, departments] = await Promise.all([
    db.district.findMany({
      where: districtScope(user, state.code),
      orderBy: { name: "asc" },
      select: { id: true, geoCode: true, name: true, nameLocal: true },
    }),
    db.department.findMany({
      where: departmentScope(user, state.code),
      select: { id: true, code: true, name: true, nameLocal: true },
    }),
  ]);
  departments.sort(
    (a, b) => DEPT_ORDER.indexOf(a.code) - DEPT_ORDER.indexOf(b.code),
  );
  return {
    districts: districts.map((d) => ({ ...d, slug: districtSlug(d.geoCode) })),
    departments: departments.map((d) => ({ ...d, slug: d.code.toLowerCase() })),
  };
}

/** Project conditions for the district / department / search filters (not status). */
function baseWhere(
  user: CurrentUser,
  state: StateConfig,
  f: ProjectFilters,
  options: Awaited<ReturnType<typeof filterOptions>>,
) {
  const where: Prisma.ProjectWhereInput[] = [projectScope(user, state.code)];
  const district = f.district
    ? options.districts.find(
        (d) => d.geoCode === geoCodeFromSlug(state.code, f.district!),
      )
    : undefined;
  const department = f.dept
    ? options.departments.find((d) => d.slug === f.dept)
    : undefined;
  if (district) where.push({ districtId: district.id });
  if (department) where.push({ departmentId: department.id });
  if (f.q)
    where.push({
      OR: [{ name: { contains: f.q } }, { nameLocal: { contains: f.q } }],
    });
  // Unknown or out-of-scope slugs are ignored, so report what was actually applied.
  return {
    where,
    applied: {
      ...f,
      district: district?.slug ?? null,
      dept: department?.slug ?? null,
    },
  };
}

/** All projects in the user's scope, filtered — the Projects page. */
export async function getStateProjects(
  user: CurrentUser,
  state: StateConfig,
  f: ProjectFilters,
) {
  const options = await filterOptions(user, state);
  const { where, applied } = baseWhere(user, state, f, options);
  const [statusGroups, projects] = await Promise.all([
    // Chip counts reflect the other filters but not the status filter.
    db.project.groupBy({ by: ["status"], where: { AND: where }, _count: true }),
    db.project.findMany({
      where: {
        AND: [
          ...where,
          ...(f.statuses.length ? [{ status: { in: f.statuses } }] : []),
        ],
      },
      include: ROW_INCLUDE,
    }),
  ]);
  return {
    options,
    filters: applied,
    counts: countByStatus(statusGroups),
    rows: sortRows(projects.map(toRow), f.sort),
  };
}

/** Projects that have imagery, newest capture first — the Imagery page. */
export async function getImageryProjects(
  user: CurrentUser,
  state: StateConfig,
  f: ProjectFilters,
) {
  const options = await filterOptions(user, state);
  const { where, applied } = baseWhere(user, state, f, options);
  const [projects, withoutImagery] = await Promise.all([
    db.project.findMany({
      where: { AND: [...where, { imagery: { some: {} } }] },
      select: {
        id: true,
        name: true,
        nameLocal: true,
        status: true,
        district: { select: { name: true, nameLocal: true } },
        department: { select: { code: true, name: true, nameLocal: true } },
        imagery: {
          select: { id: true, captureDate: true, source: true },
          orderBy: { captureDate: "desc" },
        },
      },
    }),
    db.project.count({ where: { AND: [...where, { imagery: { none: {} } }] } }),
  ]);
  const items = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
      nameLocal: p.nameLocal,
      status: p.status as ProjectStatus,
      district: p.district,
      department: p.department,
      latest: p.imagery[0],
      first: p.imagery.at(-1)!,
      captures: p.imagery.length,
    }))
    .sort(
      (a, b) =>
        b.latest.captureDate.getTime() - a.latest.captureDate.getTime() ||
        a.name.localeCompare(b.name),
    );
  return { options, filters: applied, items, withoutImagery };
}

type LatestImage = { id: string; captureDate: Date; projectId: string };

/** Latest image per group (district or department) among the given projects. */
function latestBy<K extends "districtId" | "departmentId">(
  projects: ({ id: string } & Record<K, string> & {
      imagery: { id: string; captureDate: Date }[];
    })[],
  key: K,
) {
  const map = new Map<string, LatestImage>();
  for (const p of projects) {
    const img = p.imagery[0];
    if (!img) continue;
    const cur = map.get(p[key]);
    if (!cur || img.captureDate > cur.captureDate)
      map.set(p[key], { ...img, projectId: p.id });
  }
  return map;
}

/** Districts in the user's scope with project counts, health and their latest image — the Districts page. */
export async function getDistrictCards(user: CurrentUser, state: StateConfig) {
  const [districts, projects] = await Promise.all([
    db.district.findMany({
      where: districtScope(user, state.code),
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: projectScope(user, state.code),
      select: {
        id: true,
        status: true,
        districtId: true,
        imagery: {
          select: { id: true, captureDate: true },
          orderBy: { captureDate: "desc" },
          take: 1,
        },
      },
    }),
  ]);
  const counts = new Map<string, StatusCounts>();
  for (const p of projects) {
    const c = counts.get(p.districtId) ?? { ...EMPTY_COUNTS };
    c[COUNT_KEY[p.status as ProjectStatus]] += 1;
    c.total += 1;
    counts.set(p.districtId, c);
  }
  const latest = latestBy(projects, "districtId");
  return districts.map((d) => {
    const c = counts.get(d.id) ?? { ...EMPTY_COUNTS };
    return {
      slug: districtSlug(d.geoCode),
      name: d.name,
      nameLocal: d.nameLocal,
      counts: c,
      health: classifyHealth(c),
      latestImage: latest.get(d.id) ?? null,
    };
  });
}

/** Departments in the user's scope with project counts, budget and their latest image — the Departments page. */
export async function getDepartmentCards(
  user: CurrentUser,
  state: StateConfig,
) {
  const [departments, projects] = await Promise.all([
    db.department.findMany({ where: departmentScope(user, state.code) }),
    db.project.findMany({
      where: projectScope(user, state.code),
      select: {
        id: true,
        status: true,
        departmentId: true,
        budgetLakhs: true,
        districtId: true,
        imagery: {
          select: { id: true, captureDate: true },
          orderBy: { captureDate: "desc" },
          take: 1,
        },
      },
    }),
  ]);
  departments.sort(
    (a, b) => DEPT_ORDER.indexOf(a.code) - DEPT_ORDER.indexOf(b.code),
  );
  const counts = new Map<string, StatusCounts>();
  const budget = new Map<string, number>();
  const districtsOf = new Map<string, Set<string>>();
  for (const p of projects) {
    const c = counts.get(p.departmentId) ?? { ...EMPTY_COUNTS };
    c[COUNT_KEY[p.status as ProjectStatus]] += 1;
    c.total += 1;
    counts.set(p.departmentId, c);
    budget.set(
      p.departmentId,
      (budget.get(p.departmentId) ?? 0) + (p.budgetLakhs ?? 0),
    );
    districtsOf.set(
      p.departmentId,
      (districtsOf.get(p.departmentId) ?? new Set()).add(p.districtId),
    );
  }
  const latest = latestBy(projects, "departmentId");
  return departments.map((d) => {
    const c = counts.get(d.id) ?? { ...EMPTY_COUNTS };
    return {
      code: d.code,
      slug: d.code.toLowerCase(),
      name: d.name,
      nameLocal: d.nameLocal,
      counts: c,
      health: classifyHealth(c),
      budgetLakhs: budget.get(d.id) ?? 0,
      districts: districtsOf.get(d.id)?.size ?? 0,
      latestImage: latest.get(d.id) ?? null,
    };
  });
}

const COUNT_KEY: Record<ProjectStatus, keyof Omit<StatusCounts, "total">> = {
  NOT_STARTED: "notStarted",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  DELAYED: "delayed",
  STALLED: "stalled",
};
