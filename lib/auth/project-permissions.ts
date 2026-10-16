/**
 * What a user may do with projects. Only meaningful for projects already
 * inside the user's scope (see scope.ts / assertCanAccessProject); every
 * server action checks scope as well as these permissions.
 */
import type { CurrentUser } from "./dal";

const has = (user: CurrentUser, p: string) => (user.permissions as string[]).includes(p);

/** Collectors (own district) and Admin. */
export const canCreateProject = (user: CurrentUser) => has(user, "projects.create");

/** Collectors, Department Heads (own department) and Admin. */
export const canEditProject = (user: CurrentUser) => has(user, "projects.edit");

/** Everyone above plus Field Officers on their assigned projects. */
export const canUpdateProgress = (user: CurrentUser) => has(user, "progress.update");
