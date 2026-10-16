/**
 * Data Access Layer for authentication and authorization.
 *
 * Pages, layouts and server actions get the user from here — never from the
 * session directly. The user is re-loaded from the database on each request so
 * deactivations and role changes take effect immediately.
 */
import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ROLE_KEYS, type Permission, type RoleKey } from "@/lib/constants";
import { getStateConfig, type StateCode } from "@/config/states";
import { stateBasePath, type Portal } from "@/config/portals";
import { getCurrentPortal } from "@/lib/portal";
import { canAccessState, projectScope, type ScopeUser } from "./scope";

export type CurrentUser = ScopeUser & {
  /** The portal this request is on (the user's session is only valid here). */
  portal: Portal;
  name: string;
  email: string;
  designation: string | null;
  roleName: string;
  permissions: Permission[];
  districtName: string | null;
  departmentName: string | null;
};

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Auth.js reads the clock before the request, which Cache Components rejects
  // during prerendering. Mark this as request-time work first.
  await connection();
  const [session, portal] = await Promise.all([auth(), getCurrentPortal()]);
  const userId = session?.user?.id;
  // Sessions are only valid on the portal that issued them.
  if (!userId || !portal || session.user.portal !== portal.id) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: true, state: true, district: true, department: true },
  });
  if (!user || !user.active || !ROLE_KEYS.includes(user.role.key as RoleKey)) return null;
  // Re-check portal membership in case the user's role or state has changed since sign-in.
  const isAdmin = user.role.key === "ADMIN";
  if (portal.kind === "admin" ? !isAdmin : isAdmin || user.state?.code !== portal.stateCode) return null;

  let permissions: Permission[] = [];
  try {
    permissions = JSON.parse(user.role.permissions);
  } catch {
    permissions = [];
  }

  return {
    id: user.id,
    portal,
    name: user.name,
    email: user.email,
    designation: user.designation,
    roleKey: user.role.key as RoleKey,
    roleName: user.role.name,
    permissions,
    stateId: user.stateId,
    stateCode: (user.state?.code as StateCode | undefined) ?? null,
    districtId: user.districtId,
    districtName: user.district?.name ?? null,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
  };
});

/** The signed-in user; redirects to /login otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function can(user: CurrentUser, permission: Permission) {
  return user.permissions.includes(permission);
}

/** Requires a permission. Use at the top of every server action. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) throw new Error(`Not authorized: ${permission}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.roleKey !== "ADMIN") notFound();
  return user;
}

/**
 * Validates a `[state]` route param ("rj" / "mh"), that the current portal
 * serves that state, and that the user may access it. Anything else 404s so
 * we don't reveal what exists. `basePath` prefixes links to the state's pages
 * ("" on the state's own portal, "/rj" on the admin portal).
 */
export async function requireStateAccess(stateParam: string) {
  const user = await requireUser();
  const config = getStateConfig(stateParam.toUpperCase());
  if (!config || !portalServesState(user.portal, config.code) || !canAccessState(user, config.code)) notFound();
  return { user, state: config, basePath: stateBasePath(user.portal, config.code) };
}

function portalServesState(portal: Portal, stateCode: StateCode) {
  return portal.kind === "admin" || portal.stateCode === stateCode;
}

/**
 * The project's state if it exists inside the user's scope and on this portal,
 * otherwise null. Use in server actions, which should return an error rather than 404.
 */
export async function findAccessibleProject(user: CurrentUser, projectId: string) {
  if (typeof projectId !== "string" || !projectId) return null;
  const project = await db.project.findFirst({
    where: { id: projectId },
    select: { id: true, district: { select: { state: { select: { code: true } } } } },
  });
  if (!project) return null;
  const stateCode = project.district.state.code as StateCode;
  if (!portalServesState(user.portal, stateCode)) return null;
  const visible = await db.project.count({ where: { AND: [{ id: projectId }, projectScope(user, stateCode)] } });
  return visible ? { projectId, stateCode } : null;
}

/** Throws a 404 unless the project exists inside the user's scope. */
export async function assertCanAccessProject(user: CurrentUser, projectId: string) {
  const found = await findAccessibleProject(user, projectId);
  if (!found) notFound();
  return found;
}
