/**
 * Audit log: plain-language descriptions, filters and state scoping, shared by
 * the admin audit log, a state's activity log and the CSV export.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  DIRECTIVE_STATUS_LABELS,
  ISSUE_STATUS_LABELS,
  PERMISSION_GROUPS,
  ROLE_DEFINITIONS,
  VERIFICATION_OUTCOME_LABELS,
  type DirectiveStatus,
  type IssueStatus,
  type RoleKey,
  type VerificationOutcome,
} from "@/lib/constants";
import { STATE_CODES, type StateCode } from "@/config/states";
import { stateBasePath, type Portal } from "@/config/portals";
import { parseDateInput } from "@/lib/dates";

export const AUDIT_CATEGORIES = {
  signins: { label: "Sign-ins", actions: ["auth.login", "auth.login_failed", "auth.logout", "auth.password_change"] },
  projects: { label: "Projects", actions: ["project.create", "project.update", "progress.update"] },
  imagery: { label: "Imagery", actions: ["imagery.upload"] },
  verifications: { label: "Verifications", actions: ["verification.record"] },
  issues: { label: "Issues", actions: ["issue.create", "issue.status"] },
  directives: { label: "Directives", actions: ["directive.issue", "directive.status"] },
  admin: { label: "User admin", actions: ["user.create", "user.update", "user.activate", "user.deactivate", "user.password_reset", "user.projects", "role.update"] },
} as const;
export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

const PROJECT_FIELDS: Record<string, string> = {
  name: "name",
  nameLocal: "local name",
  description: "description",
  latitude: "location",
  longitude: "location",
  budgetLakhs: "budget",
  startDate: "start date",
  plannedEndDate: "planned end date",
  district: "district",
  department: "department",
};

const FAILED_REASONS: Record<string, string> = {
  unknown_user: "unknown email",
  inactive: "account deactivated",
  bad_password: "wrong password",
  wrong_portal: "not registered on this portal",
};

const PERMISSION_LABEL = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function parseDetails(details: string | null): Record<string, unknown> {
  try {
    const d = details ? JSON.parse(details) : {};
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

/** One-line description of what happened (the target is shown separately). */
export function summarize(action: string, details: string | null): string {
  const d = parseDetails(details);
  switch (action) {
    case "auth.login":
      return "Signed in";
    case "auth.login_failed":
      return `Failed sign-in${d.email ? ` as ${d.email}` : ""} (${FAILED_REASONS[d.reason as string] ?? d.reason ?? "unknown"})`;
    case "auth.logout":
      return "Signed out";
    case "auth.password_change":
      return d.forced ? "Chose a new password (required after reset)" : "Changed their password";
    case "project.create":
      return "Project created";
    case "project.update": {
      const fields = [...new Set(Object.keys((d.changes as object) ?? {}).map((k) => PROJECT_FIELDS[k] ?? k))];
      return fields.length ? `Edited ${fields.join(", ")}` : "Edited project";
    }
    case "progress.update": {
      const from = d.from as { progress?: number } | undefined;
      const to = d.to as { progress?: number } | undefined;
      return `Progress ${from?.progress ?? "?"}% → ${to?.progress ?? "?"}%`;
    }
    case "issue.create":
      return `Issue raised: ${d.title ?? ""}`;
    case "issue.status":
      return `Issue ${lower(ISSUE_STATUS_LABELS[d.from as IssueStatus] ?? String(d.from))} → ${lower(ISSUE_STATUS_LABELS[d.to as IssueStatus] ?? String(d.to))}`;
    case "verification.record":
      return `Verification recorded: ${lower(VERIFICATION_OUTCOME_LABELS[d.outcome as VerificationOutcome] ?? String(d.outcome))}`;
    case "imagery.upload":
      return `Uploaded ${d.count ?? ""} image${d.count === 1 ? "" : "s"}`;
    case "directive.issue":
      return "Directive issued";
    case "directive.status":
      return `Directive ${lower(DIRECTIVE_STATUS_LABELS[d.from as DirectiveStatus] ?? String(d.from))} → ${lower(DIRECTIVE_STATUS_LABELS[d.to as DirectiveStatus] ?? String(d.to))}`;
    case "user.create":
      return `User created as ${ROLE_DEFINITIONS[d.role as RoleKey]?.name ?? d.role}`;
    case "user.update": {
      const fields = Object.keys((d.changes as object) ?? {});
      return fields.length ? `User edited: ${fields.join(", ")}` : "User edited";
    }
    case "user.activate":
      return "User reactivated";
    case "user.deactivate":
      return "User deactivated";
    case "user.password_reset":
      return "Temporary password set";
    case "user.projects":
      return `Project assignments changed (+${d.added ?? 0}, −${d.removed ?? 0})`;
    case "role.update": {
      const parts = [
        ...((d.added as string[]) ?? []).map((p) => `+${PERMISSION_LABEL[p] ?? p}`),
        ...((d.removed as string[]) ?? []).map((p) => `−${PERMISSION_LABEL[p] ?? p}`),
      ];
      return `Permissions changed${parts.length ? `: ${parts.join(", ")}` : ""}`;
    }
    default:
      return action;
  }
}

// ---------------------------------------------------------------------------
// Filters

export type AuditFilters = {
  from: string | null; // YYYY-MM-DD (IST)
  to: string | null;
  user: string | null;
  cat: AuditCategory | null;
  state: StateCode | null; // admin only; state views are always fixed to their state
  failed: boolean;
  page: number;
};

export const AUDIT_PAGE_SIZE = 50;
/** Most rows a CSV export returns (newest first). */
const CSV_LIMIT = 10_000;

export function parseAuditFilters(sp: Record<string, string | string[] | undefined>): AuditFilters {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const date = (v: unknown) => (str(v) && parseDateInput(str(v)!) ? str(v) : null);
  const cat = str(sp.cat);
  const state = str(sp.state)?.toUpperCase();
  const page = Number.parseInt(str(sp.page) ?? "1", 10);
  return {
    from: date(sp.from),
    to: date(sp.to),
    user: str(sp.user)?.slice(0, 40) ?? null,
    cat: cat && cat in AUDIT_CATEGORIES ? (cat as AuditCategory) : null,
    state: STATE_CODES.find((c) => c === state) ?? null,
    failed: sp.failed === "1",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/**
 * Entries that concern one state: its projects (and their issues, imagery,
 * verifications), its directives, its users' sign-ins and account changes, and
 * failed sign-ins on its portal. Role edits apply to every state, so they're
 * only in the admin's unscoped view.
 */
async function stateWhere(stateCode: StateCode): Promise<Prisma.AuditLogWhereInput> {
  const [projects, directives, users] = await Promise.all([
    db.project.findMany({ where: { district: { state: { code: stateCode } } }, select: { id: true } }),
    db.directive.findMany({
      where: {
        OR: [
          { district: { state: { code: stateCode } } },
          { department: { state: { code: stateCode } } },
          { project: { district: { state: { code: stateCode } } } },
        ],
      },
      select: { id: true },
    }),
    db.user.findMany({ where: { state: { code: stateCode } }, select: { id: true } }),
  ]);
  return {
    OR: [
      { entityType: "Project", entityId: { in: projects.map((p) => p.id) } },
      { entityType: "Directive", entityId: { in: directives.map((d) => d.id) } },
      { entityType: "User", entityId: { in: users.map((u) => u.id) } },
      { action: "auth.login_failed", entityId: null, details: { contains: `"portal":"${stateCode}"` } },
    ],
  };
}

/** `scopeState` fixes the view to one state (CMO activity log); null = everything (admin). */
async function buildWhere(f: AuditFilters, scopeState: StateCode | null): Promise<Prisma.AuditLogWhereInput> {
  const and: Prisma.AuditLogWhereInput[] = [];
  const state = scopeState ?? f.state;
  if (state) and.push(await stateWhere(state));
  if (scopeState) and.push({ action: { not: "role.update" } });
  if (f.from) and.push({ createdAt: { gte: parseDateInput(f.from)! } });
  if (f.to) and.push({ createdAt: { lt: new Date(parseDateInput(f.to)!.getTime() + 86_400_000) } });
  if (f.user) and.push({ userId: f.user });
  if (f.failed) and.push({ action: "auth.login_failed" });
  else if (f.cat) and.push({ action: { in: [...AUDIT_CATEGORIES[f.cat].actions] } });
  return { AND: and };
}

export type AuditRow = {
  id: string;
  at: Date;
  action: string;
  failed: boolean;
  actor: { id: string; name: string; role: string } | null;
  summary: string;
  target: { label: string; href: string | null } | null;
  stateCode: StateCode | null;
  details: Record<string, unknown>;
};

/**
 * Resolves each entry's target (project / directive / user) to a name, link and
 * state. Links point to pages on the current portal: state pages via the
 * portal's base path; user pages only on the admin portal.
 */
async function resolveTargets(rows: { entityType: string; entityId: string | null; details: string | null }[], portal: Portal) {
  const ids = (type: string) => [...new Set(rows.filter((r) => r.entityType === type && r.entityId).map((r) => r.entityId!))];
  const [projects, directives, users] = await Promise.all([
    db.project.findMany({ where: { id: { in: ids("Project") } }, select: { id: true, name: true, district: { select: { state: { select: { code: true } } } } } }),
    db.directive.findMany({
      where: { id: { in: ids("Directive") } },
      select: {
        id: true,
        text: true,
        district: { select: { state: { select: { code: true } } } },
        department: { select: { state: { select: { code: true } } } },
        project: { select: { district: { select: { state: { select: { code: true } } } } } },
      },
    }),
    db.user.findMany({ where: { id: { in: ids("User") } }, select: { id: true, name: true, email: true, state: { select: { code: true } } } }),
  ]);
  const roles = await db.role.findMany({ select: { id: true, name: true } });

  const map = new Map<string, { label: string; href: string | null; stateCode: StateCode | null }>();
  for (const p of projects) {
    const code = p.district.state.code as StateCode;
    map.set(`Project:${p.id}`, { label: p.name, href: `${stateBasePath(portal, code)}/project/${p.id}`, stateCode: code });
  }
  for (const d of directives) {
    const code = (d.district?.state.code ?? d.department?.state.code ?? d.project?.district.state.code ?? null) as StateCode | null;
    map.set(`Directive:${d.id}`, {
      label: d.text.length > 80 ? `${d.text.slice(0, 80)}…` : d.text,
      href: code ? `${stateBasePath(portal, code)}/directives/${d.id}` : null,
      stateCode: code,
    });
  }
  for (const u of users) {
    map.set(`User:${u.id}`, { label: u.name, href: portal.kind === "admin" ? `/admin/users/${u.id}` : null, stateCode: (u.state?.code as StateCode) ?? null });
  }
  for (const r of roles) map.set(`Role:${r.id}`, { label: r.name, href: portal.kind === "admin" ? "/admin/roles" : null, stateCode: null });
  return map;
}

export async function queryAudit(f: AuditFilters, scopeState: StateCode | null, portal: Portal, { all = false } = {}) {
  const where = await buildWhere(f, scopeState);
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: all ? 0 : (f.page - 1) * AUDIT_PAGE_SIZE,
      take: all ? CSV_LIMIT : AUDIT_PAGE_SIZE,
    }),
  ]);
  const targets = await resolveTargets(entries, portal);

  const rows: AuditRow[] = entries.map((e) => {
    const details = parseDetails(e.details);
    const target = e.entityId ? targets.get(`${e.entityType}:${e.entityId}`) : undefined;
    // Issue entries are recorded against the project; link to the issue itself.
    const issueId = typeof details.issueId === "string" ? details.issueId : null;
    const href = issueId && target?.stateCode ? `${stateBasePath(portal, target.stateCode)}/issues/${issueId}` : (target?.href ?? null);
    const portalCode = typeof details.portal === "string" && details.portal !== "ADMIN" ? (details.portal as StateCode) : null;
    return {
      id: e.id,
      at: e.createdAt,
      action: e.action,
      failed: e.action === "auth.login_failed",
      actor: e.user ? { id: e.user.id, name: e.user.name, role: e.user.role.name } : null,
      summary: summarize(e.action, e.details),
      target: target ? { label: target.label, href } : null,
      stateCode: target?.stateCode ?? portalCode,
      details,
    };
  });
  return { rows, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}

/** People to offer in the "who" filter: everyone (admin) or the state's users. */
export function auditUserOptions(scopeState: StateCode | null) {
  return db.user.findMany({
    where: scopeState ? { state: { code: scopeState } } : {},
    select: { id: true, name: true, role: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}
