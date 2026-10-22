/**
 * Domain enums. SQLite has no native enums, so these are stored as strings in
 * the DB and validated here. When moving to PostgreSQL they can become Prisma enums.
 * Display labels live in the translations (messages/*.json → "enums").
 */

export const PROJECT_STATUSES = [
  "NOT_STARTED",
  "ONGOING",
  "COMPLETED",
  "DELAYED",
  "STALLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];


export const IMAGERY_SOURCES = ["SATELLITE", "DRONE", "FIELD_PHOTO"] as const;
export type ImagerySource = (typeof IMAGERY_SOURCES)[number];


export const ISSUE_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "ARCHIVED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];


export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];


export const DIRECTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLIED", "CLOSED"] as const;
export type DirectiveStatus = (typeof DIRECTIVE_STATUSES)[number];


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
    description: "Whole-state view; issues directives; can add imagery",
    permissions: ["projects.view", "imagery.upload", "verification.record", "directives.issue", "directives.update", "issues.update", "audit.view"],
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


/** Plain-language labels for the role permission table, grouped. */
export const PERMISSION_GROUPS: { group: string; items: { key: Permission; label: string; hint: string }[] }[] = [
  {
    group: "Projects",
    items: [
      { key: "projects.view", label: "View projects", hint: "See projects, maps and dashboards in scope (always on)" },
      { key: "projects.create", label: "Add projects", hint: "Create new projects" },
      { key: "projects.edit", label: "Edit projects", hint: "Change project details, location, budget and dates" },
      { key: "progress.update", label: "Update progress", hint: "Record progress % and status" },
    ],
  },
  {
    group: "Imagery",
    items: [
      { key: "imagery.upload", label: "Upload imagery", hint: "Upload satellite, drone and field photos" },
      { key: "verification.record", label: "Record verifications", hint: "Record the outcome of comparing imagery" },
    ],
  },
  {
    group: "Issues & directives",
    items: [
      { key: "issues.create", label: "Raise issues", hint: "Raise issues on projects" },
      { key: "issues.update", label: "Update issues", hint: "Change issue status (resolve, reopen, archive)" },
      { key: "directives.issue", label: "Issue directives", hint: "Issue, close and reopen directives" },
      { key: "directives.update", label: "Respond to directives", hint: "Mark directives in progress or complied" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "audit.view", label: "View activity log", hint: "See the audit log for their state" },
      { key: "users.manage", label: "Manage users & roles", hint: "Admin portal: users, roles, full audit log" },
      { key: "masters.manage", label: "Manage master data", hint: "States, districts, departments" },
      { key: "state.switch", label: "Switch states", hint: "Work across states (admin portal)" },
    ],
  },
];

/** Permissions only the Admin role may hold (administration of the whole system). */
export const ADMIN_ONLY_PERMISSIONS: Permission[] = ["users.manage", "masters.manage", "state.switch"];
