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

/** Everyone who can update progress, plus the CMO. Imagery is never edited or deleted. */
export const canUploadImagery = (user: CurrentUser) => has(user, "imagery.upload");

/** CMO, Admin, Department Heads and Collectors sign off comparisons; Field Officers collect imagery. */
export const canRecordVerification = (user: CurrentUser) => has(user, "verification.record");

/** Collectors, Department Heads, Field Officers (assigned projects) and Admin. */
export const canRaiseIssue = (user: CurrentUser) => has(user, "issues.create");

/** Collectors, Department Heads, CMO and Admin. */
export const canUpdateIssue = (user: CurrentUser) => has(user, "issues.update");

/** CMO / Chief Secretary and Admin issue, close and reopen directives. */
export const canIssueDirective = (user: CurrentUser) => has(user, "directives.issue");
