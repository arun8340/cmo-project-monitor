/**
 * Domain enums. SQLite has no native enums, so these are stored as strings in
 * the DB and validated here. When moving to PostgreSQL they can become Prisma enums.
 */

export const PROJECT_STATUSES = [
  "NOT_STARTED",
  "ONGOING",
  "COMPLETED",
  "DELAYED",
  "STALLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not started",
  ONGOING: "On-going",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  STALLED: "Stalled",
};

export const IMAGERY_SOURCES = ["SATELLITE", "DRONE", "FIELD_PHOTO"] as const;
export type ImagerySource = (typeof IMAGERY_SOURCES)[number];

export const IMAGERY_SOURCE_LABELS: Record<ImagerySource, string> = {
  SATELLITE: "Satellite",
  DRONE: "Drone",
  FIELD_PHOTO: "Field Photo",
};

export const ISSUE_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "ARCHIVED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const DIRECTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLIED", "CLOSED"] as const;
export type DirectiveStatus = (typeof DIRECTIVE_STATUSES)[number];

export const DIRECTIVE_STATUS_LABELS: Record<DirectiveStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLIED: "Complied",
  CLOSED: "Closed",
};

export const ROLE_KEYS = [
  "ADMIN",
  "CMO",
  "DEPARTMENT_HEAD",
  "DISTRICT_COLLECTOR",
  "FIELD_OFFICER",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Permission strings stored (JSON-encoded) on Role.permissions */
export const PERMISSIONS = [
  "users.manage",
  "masters.manage", // states, districts, departments
  "state.switch",
  "projects.view",
  "projects.create",
  "projects.edit",
  "progress.update",
  "imagery.upload",
  "verification.record",
  "issues.create",
  "issues.update",
  "directives.issue",
  "directives.update",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_DEFINITIONS: Record<
  RoleKey,
  { name: string; description: string; permissions: Permission[] }
> = {
  ADMIN: {
    name: "Admin",
    description: "Full access across all states",
    permissions: [...PERMISSIONS],
  },
  CMO: {
    name: "CM / CMO / Chief Secretary",
    description: "Whole-state view; issues directives",
    permissions: ["projects.view", "verification.record", "directives.issue", "directives.update", "issues.update", "audit.view"],
  },
  DEPARTMENT_HEAD: {
    name: "Department Head",
    description: "One department across the state",
    permissions: [
      "projects.view",
      "projects.edit",
      "progress.update",
      "imagery.upload",
      "verification.record",
      "issues.create",
      "issues.update",
      "directives.update",
    ],
  },
  DISTRICT_COLLECTOR: {
    name: "District Collector",
    description: "All departments within one district",
    permissions: [
      "projects.view",
      "projects.create",
      "projects.edit",
      "progress.update",
      "imagery.upload",
      "verification.record",
      "issues.create",
      "issues.update",
      "directives.update",
    ],
  },
  FIELD_OFFICER: {
    name: "Field Officer",
    description: "Uploads field photos, progress and issues for assigned projects",
    permissions: ["projects.view", "progress.update", "imagery.upload", "issues.create"],
  },
};

/** Outcome of comparing dated imagery against reported progress. */
export const VERIFICATION_OUTCOMES = ["PROGRESS_VISIBLE", "NO_VISIBLE_CHANGE", "DISCREPANCY"] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

export const VERIFICATION_OUTCOME_LABELS: Record<VerificationOutcome, string> = {
  PROGRESS_VISIBLE: "Progress visible",
  NO_VISIBLE_CHANGE: "No visible change",
  DISCREPANCY: "Discrepancy with reported progress",
};
