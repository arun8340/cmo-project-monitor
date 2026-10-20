import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ROLE_DEFINITIONS, ROLE_KEYS, type RoleKey } from "@/lib/constants";
import { STATE_CODES } from "@/config/states";

export type UserFilters = { state: string | null; role: RoleKey | null; status: "active" | "inactive" | "all"; q: string };

export function parseUserFilters(sp: Record<string, string | string[] | undefined>): UserFilters {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const state = str(sp.state)?.toUpperCase() ?? null;
  const role = ROLE_KEYS.find((r) => r === str(sp.role)?.toUpperCase()) ?? null;
  const status = str(sp.status) === "inactive" ? "inactive" : str(sp.status) === "all" ? "all" : "active";
  return {
    state: state === "NONE" || STATE_CODES.includes(state as never) ? state : null,
    role,
    status,
    q: (str(sp.q) ?? "").trim().slice(0, 100),
  };
}

export async function listUsers(f: UserFilters) {
  const where: Prisma.UserWhereInput[] = [];
  if (f.state === "NONE") where.push({ stateId: null });
  else if (f.state) where.push({ state: { code: f.state } });
  if (f.role) where.push({ role: { key: f.role } });
  if (f.status !== "all") where.push({ active: f.status === "active" });
  if (f.q) where.push({ OR: [{ name: { contains: f.q } }, { email: { contains: f.q.toLowerCase() } }, { designation: { contains: f.q } }] });

  const [users, lastLogins, counts] = await Promise.all([
    db.user.findMany({
      where: { AND: where },
      include: { role: true, state: true, district: true, department: true, _count: { select: { assignedProjects: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    db.auditLog.groupBy({ by: ["userId"], where: { action: "auth.login", userId: { not: null } }, _max: { createdAt: true } }),
    db.user.groupBy({ by: ["active"], _count: true }),
  ]);
  const last = new Map(lastLogins.map((l) => [l.userId, l._max.createdAt]));
  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      designation: u.designation,
      roleKey: u.role.key as RoleKey,
      roleName: u.role.name,
      state: u.state?.name ?? null,
      stateCode: u.state?.code ?? null,
      district: u.district?.name ?? null,
      department: u.department?.name ?? null,
      assignedProjects: u._count.assignedProjects,
      active: u.active,
      mustChangePassword: u.mustChangePassword,
      lastLogin: last.get(u.id) ?? null,
      createdAt: u.createdAt,
    })),
    activeCount: counts.find((c) => c.active)?._count ?? 0,
    inactiveCount: counts.find((c) => !c.active)?._count ?? 0,
  };
}

/** States with their districts and departments, for the user form. */
export async function getScopeOptions() {
  const states = await db.state.findMany({
    include: { districts: { orderBy: { name: "asc" } }, departments: true },
    orderBy: { name: "asc" },
  });
  const ORDER = ["PWD", "METRO", "DRAINAGE", "URBAN", "RNB", "RURAL", "MGNREGA"];
  return states.map((s) => ({
    code: s.code,
    name: s.name,
    districts: s.districts.map((d) => ({ id: d.id, name: d.name })),
    departments: s.departments.sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)).map((d) => ({ id: d.id, name: d.name })),
  }));
}

export async function getUserForEdit(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: { role: true, state: true, district: true, department: true, assignedProjects: { select: { id: true } } },
  });
  if (!user) return null;
  const [lastLogin, recent, districtProjects] = await Promise.all([
    db.auditLog.findFirst({ where: { userId: id, action: "auth.login" }, orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({ where: { OR: [{ userId: id }, { entityType: "User", entityId: id }] }, orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    user.districtId
      ? db.project.findMany({
          where: { districtId: user.districtId },
          select: { id: true, name: true, department: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : [],
  ]);
  return { user, lastLogin: lastLogin?.createdAt ?? null, recent, districtProjects };
}

/** Roles for the user form's role picker. */
export const roleOptions = () => ROLE_KEYS.map((k) => ({ key: k, name: ROLE_DEFINITIONS[k].name, description: ROLE_DEFINITIONS[k].description }));
