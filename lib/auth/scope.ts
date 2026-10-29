/**
 * Role-based data scoping. Every query for projects, issues, directives etc.
 * must AND its filter with one of these so users only ever see data inside
 * their scope — regardless of URL, form input or UI state.
 *
 * Pure functions (no Next.js / DB imports) so they can be unit-checked from
 * scripts/check-scopes.ts.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { RoleKey } from "@/lib/constants";
import type { StateCode } from "@/config/states";

/** The subset of the current user that scoping depends on. */
export type ScopeUser = {
  id: string;
  roleKey: RoleKey;
  stateId: string | null;
  stateCode: StateCode | null;
  districtId: string | null;
  departmentId: string | null;
};

/** Matches nothing — used when a user's profile is incomplete. */
const NONE = { id: "__no_access__" } as const;

/** Whether the user may work in the given state at all. */
export function canAccessState(user: ScopeUser, stateCode: StateCode) {
  return user.roleKey === "ADMIN" || user.stateCode === stateCode;
}

/**
 * Projects visible to the user within `stateCode`.
 * Admin and CMO see the whole state; others are narrowed further.
 */
export function projectScope(user: ScopeUser, stateCode: StateCode): Prisma.ProjectWhereInput {
  if (!canAccessState(user, stateCode)) return NONE;
  const inState: Prisma.ProjectWhereInput = { district: { state: { code: stateCode } } };

  switch (user.roleKey) {
    case "ADMIN":
    case "CMO":
    case "DOIT":
      return inState;
    case "DEPARTMENT_HEAD":
      return user.departmentId ? { AND: [inState, { departmentId: user.departmentId }] } : NONE;
    case "DISTRICT_COLLECTOR":
      return user.districtId ? { AND: [inState, { districtId: user.districtId }] } : NONE;
    case "FIELD_OFFICER":
      return { AND: [inState, { assignedOfficers: { some: { id: user.id } } }] };
    default:
      return NONE;
  }
}

/** Issues are visible when their project is. */
export function issueScope(user: ScopeUser, stateCode: StateCode): Prisma.IssueWhereInput {
  if (user.roleKey === "DOIT") return { id: NONE.id }; // DoIT only handles imagery
  return { project: projectScope(user, stateCode) };
}

/**
 * Directives visible to the user: anything targeted at their district /
 * department / visible projects, plus anything they issued or own.
 */
export function directiveScope(user: ScopeUser, stateCode: StateCode): Prisma.DirectiveWhereInput {
  if (!canAccessState(user, stateCode) || user.roleKey === "DOIT") return { id: NONE.id };

  const inState: Prisma.DirectiveWhereInput = {
    OR: [
      { district: { state: { code: stateCode } } },
      { department: { state: { code: stateCode } } },
      { project: { district: { state: { code: stateCode } } } },
    ],
  };
  const mine: Prisma.DirectiveWhereInput[] = [{ fromUserId: user.id }, { ownerId: user.id }];

  switch (user.roleKey) {
    case "ADMIN":
    case "CMO":
      return inState;
    case "DEPARTMENT_HEAD":
      return {
        AND: [
          inState,
          { OR: [...mine, { departmentId: user.departmentId ?? NONE.id }, { project: projectScope(user, stateCode) }] },
        ],
      };
    case "DISTRICT_COLLECTOR":
      return {
        AND: [
          inState,
          { OR: [...mine, { districtId: user.districtId ?? NONE.id }, { project: projectScope(user, stateCode) }] },
        ],
      };
    case "FIELD_OFFICER":
      return { AND: [inState, { OR: [...mine, { project: projectScope(user, stateCode) }] }] };
    default:
      return { id: NONE.id };
  }
}

/** Districts the user can open (the map still shows all districts). */
export function districtScope(user: ScopeUser, stateCode: StateCode): Prisma.DistrictWhereInput {
  if (!canAccessState(user, stateCode)) return NONE;
  const inState: Prisma.DistrictWhereInput = { state: { code: stateCode } };
  switch (user.roleKey) {
    case "DISTRICT_COLLECTOR":
      return { AND: [inState, { id: user.districtId ?? NONE.id }] };
    case "FIELD_OFFICER":
      return { AND: [inState, { projects: { some: { assignedOfficers: { some: { id: user.id } } } } }] };
    default:
      return inState;
  }
}

/** Departments the user can open. */
export function departmentScope(user: ScopeUser, stateCode: StateCode): Prisma.DepartmentWhereInput {
  if (!canAccessState(user, stateCode)) return NONE;
  const inState: Prisma.DepartmentWhereInput = { state: { code: stateCode } };
  if (user.roleKey === "DEPARTMENT_HEAD") return { AND: [inState, { id: user.departmentId ?? NONE.id }] };
  return inState;
}

/** Imagery requests are visible when their project is (DoIT sees the whole state). */
export function imageryRequestScope(user: ScopeUser, stateCode: StateCode): Prisma.ImageryRequestWhereInput {
  return { project: projectScope(user, stateCode) };
}
