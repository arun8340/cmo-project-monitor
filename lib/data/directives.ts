import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StateConfig } from "@/config/states";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope, issueScope, projectScope } from "@/lib/auth/scope";
import type { DirectiveStatus } from "@/lib/constants";
import { districtSlug, geoCodeFromSlug } from "@/lib/district-slug";
import { OPEN_DIRECTIVE_STATUSES, OPEN_ISSUE_STATUSES } from "@/lib/workflow";

export const DIRECTIVE_TABS = ["open", "overdue", "complied", "closed", "all"] as const;
export type DirectiveTab = (typeof DIRECTIVE_TABS)[number];

export type DirectiveFilters = { tab: DirectiveTab; district: string | null; dept: string | null; mine: boolean };

export function parseDirectiveFilters(sp: Record<string, string | string[] | undefined>): DirectiveFilters {
  const str = (v: unknown) => (typeof v === "string" && v ? v.toLowerCase() : null);
  const tab = DIRECTIVE_TABS.find((t) => t === str(sp.tab)) ?? "open";
  return { tab, district: str(sp.district), dept: str(sp.dept), mine: sp.mine === "1" };
}

function tabWhere(tab: DirectiveTab, now: Date): Prisma.DirectiveWhereInput {
  switch (tab) {
    case "open":
      return { status: { in: OPEN_DIRECTIVE_STATUSES } };
    case "overdue":
      return { status: { in: OPEN_DIRECTIVE_STATUSES }, dueDate: { lt: now } };
    case "complied":
      return { status: "COMPLIED" };
    case "closed":
      return { status: "CLOSED" };
    default:
      return {};
  }
}

const include = {
  fromUser: { select: { name: true } },
  owner: { select: { id: true, name: true, designation: true } },
  district: { select: { name: true, geoCode: true } },
  department: { select: { name: true, code: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.DirectiveInclude;

type DirectiveWithTargets = Prisma.DirectiveGetPayload<{ include: typeof include }>;

/** "Jaipur district · PWD" / "Project: …" — what the directive is aimed at. */
export function targetLabel(d: DirectiveWithTargets) {
  const parts: string[] = [];
  if (d.project) parts.push(d.project.name);
  if (d.district) parts.push(`${d.district.name} district`);
  if (d.department) parts.push(d.department.name);
  return parts.join(" · ") || "—";
}

export async function listDirectives(user: CurrentUser, state: StateConfig, f: DirectiveFilters) {
  const now = new Date();
  const base: Prisma.DirectiveWhereInput[] = [directiveScope(user, state.code)];
  if (f.district) {
    const geo = geoCodeFromSlug(state.code, f.district);
    base.push({ OR: [{ district: { geoCode: geo } }, { project: { district: { geoCode: geo } } }] });
  }
  if (f.dept) {
    const code = f.dept.toUpperCase();
    base.push({ OR: [{ department: { code } }, { project: { department: { code } } }] });
  }
  if (f.mine) base.push({ OR: [{ ownerId: user.id }, { fromUserId: user.id }] });

  const counts = Object.fromEntries(
    await Promise.all(DIRECTIVE_TABS.map(async (t) => [t, await db.directive.count({ where: { AND: [...base, tabWhere(t, now)] } })] as const)),
  ) as Record<DirectiveTab, number>;

  const rows = await db.directive.findMany({ where: { AND: [...base, tabWhere(f.tab, now)] }, include, take: 500 });
  // Overdue first (most overdue on top), then soonest due, then newest.
  const due = (d: DirectiveWithTargets) => d.dueDate?.getTime() ?? Infinity;
  rows.sort((a, b) => due(a) - due(b) || b.createdAt.getTime() - a.createdAt.getTime());

  const [districts, departments] = await Promise.all([
    db.district.findMany({ where: districtScope(user, state.code), orderBy: { name: "asc" }, select: { name: true, geoCode: true } }),
    db.department.findMany({ where: departmentScope(user, state.code), select: { name: true, code: true } }),
  ]);

  return {
    rows: rows.map((d) => ({
      id: d.id,
      text: d.text,
      status: d.status as DirectiveStatus,
      dueDate: d.dueDate,
      overdue: (OPEN_DIRECTIVE_STATUSES as string[]).includes(d.status) && !!d.dueDate && d.dueDate < now,
      createdAt: d.createdAt,
      from: d.fromUser.name,
      owner: d.owner?.name ?? null,
      target: targetLabel(d),
      projectId: d.project?.id ?? null,
    })),
    counts,
    options: {
      districts: districts.map((d) => ({ slug: districtSlug(d.geoCode), name: d.name })),
      departments: departments.map((d) => ({ code: d.code.toLowerCase(), name: d.name })),
    },
  };
}

export async function getDirective(user: CurrentUser, state: StateConfig, id: string) {
  const d = await db.directive.findFirst({
    where: { AND: [{ id }, directiveScope(user, state.code)] },
    include: { ...include, updates: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } } },
  });
  return d ? { ...d, target: targetLabel(d) } : null;
}

/** Choices for the "Issue directive" form: targets in scope and the officers who could own them. */
export async function getDirectiveFormOptions(user: CurrentUser, state: StateConfig) {
  const [districts, departments, projects, officers] = await Promise.all([
    db.district.findMany({ where: districtScope(user, state.code), orderBy: { name: "asc" } }),
    db.department.findMany({ where: departmentScope(user, state.code) }),
    db.project.findMany({
      where: projectScope(user, state.code),
      select: { id: true, name: true, district: { select: { geoCode: true } }, department: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { active: true, state: { code: state.code }, role: { key: { in: ["DISTRICT_COLLECTOR", "DEPARTMENT_HEAD"] } } },
      include: { role: true, district: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const ORDER = ["PWD", "METRO", "DRAINAGE", "URBAN", "RNB", "RURAL", "MGNREGA"];
  return {
    districts: districts.map((d) => ({ slug: districtSlug(d.geoCode), name: d.name })),
    departments: departments.sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)).map((d) => ({ code: d.code.toLowerCase(), name: d.name })),
    projects: projects.map((p) => ({ id: p.id, name: p.name, district: districtSlug(p.district.geoCode), dept: p.department.code.toLowerCase() })),
    officers: officers.map((o) => ({
      id: o.id,
      name: o.name,
      role: o.role.name,
      district: o.district ? districtSlug(o.district.geoCode) : null,
      dept: o.department?.code.toLowerCase() ?? null,
    })),
  };
}

/** Counts for the header navigation. */
export async function getNavCounts(user: CurrentUser, state: StateConfig) {
  const now = new Date();
  const [openIssues, overdueDirectives] = await Promise.all([
    db.issue.count({ where: { AND: [issueScope(user, state.code), { status: { in: OPEN_ISSUE_STATUSES } }] } }),
    db.directive.count({ where: { AND: [directiveScope(user, state.code), { status: { in: OPEN_DIRECTIVE_STATUSES }, dueDate: { lt: now } }] } }),
  ]);
  return { openIssues, overdueDirectives };
}
