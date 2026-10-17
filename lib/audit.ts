/**
 * Audit log: plain-language descriptions, filters and state scoping, shared by
 * the admin audit log, a state's activity log and the CSV export.
 */
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { PERMISSION_GROUPS, type RoleKey } from "@/lib/constants";
import { getLabels, getLocale, getTranslations } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";
import { STATE_CODES, type StateCode } from "@/config/states";
import { stateBasePath, type Portal } from "@/config/portals";
import { parseDateInput } from "@/lib/dates";

/** Filter categories (labels: "activity.category.*" messages). */
export const AUDIT_CATEGORIES = {
  signins: { actions: ["auth.login", "auth.login_failed", "auth.logout", "auth.password_change"] },
  projects: { actions: ["project.create", "project.update", "progress.update"] },
  imagery: { actions: ["imagery.upload"] },
  verifications: { actions: ["verification.record"] },
  issues: { actions: ["issue.create", "issue.status"] },
  directives: { actions: ["directive.issue", "directive.status"] },
  admin: { actions: ["user.create", "user.update", "user.activate", "user.deactivate", "user.password_reset", "user.projects", "role.update"] },
} as const;
export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

const PROJECT_FIELDS: Record<string, string> = {
  name: "name",
  nameLocal: "nameLocal",
  description: "description",
  latitude: "location",
  longitude: "location",
  budgetLakhs: "budget",
  startDate: "startDate",
  plannedEndDate: "plannedEndDate",
  district: "district",
  department: "department",
};
const FAILED_REASONS = new Set(["unknown_user", "inactive", "bad_password", "wrong_portal"]);

const PERMISSION_LABEL = Object.fromEntries(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])));

export function parseDetails(details: string | null): Record<string, unknown> {
  try {
    const d = details ? JSON.parse(details) : {};
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

export type Summarize = (action: string, details: string | null) => string;

/**
 * Returns a function giving a one-line description of an audit entry in the
 * current language (the target is shown separately).
 */
export async function getSummarizer(): Promise<Summarize> {
  const [tt, labels] = await Promise.all([getTranslations("audit"), getLabels()]);
  // Keys are built at runtime from stored action names; the catalogue is checked by check:messages.
  const t = tt as unknown as (key: string, values?: Record<string, string | number>) => string;
  const lower = (s: string) => s.charAt(0).toLocaleLowerCase() + s.slice(1);
  const label = <K extends string>(map: Record<K, string>, key: unknown) => lower(map[key as K] ?? String(key));
  const list = (items: string[]) => items.join(", ");

  return (action, details) => {
    const d = parseDetails(details);
    switch (action) {
      case "auth.login":
      case "auth.logout":
      case "project.create":
      case "directive.issue":
      case "user.activate":
      case "user.deactivate":
      case "user.password_reset":
        return t(`action.${action.replace(".", "_")}`);
      case "auth.login_failed": {
        const reason = FAILED_REASONS.has(d.reason as string) ? t(`failedReason.${d.reason}`) : String(d.reason ?? t("failedReason.unknown"));
        return d.email ? t("action.auth_login_failed_as", { email: String(d.email), reason }) : t("action.auth_login_failed", { reason });
      }
      case "auth.password_change":
        return d.forced ? t("action.auth_password_change_forced") : t("action.auth_password_change");
      case "project.update": {
        const fields = [...new Set(Object.keys((d.changes as object) ?? {}).map((k) => (PROJECT_FIELDS[k] ? t(`field.${PROJECT_FIELDS[k]}`) : k)))];
        return fields.length ? t("action.project_update_fields", { fields: list(fields) }) : t("action.project_update");
      }
      case "progress.update": {
        const from = d.from as { progress?: number } | undefined;
        const to = d.to as { progress?: number } | undefined;
        return t("action.progress_update", { from: from?.progress ?? "?", to: to?.progress ?? "?" });
      }
      case "issue.create":
        return t("action.issue_create", { title: String(d.title ?? "") });
      case "issue.status":
        return t("action.issue_status", { from: label(labels.issueStatus, d.from), to: label(labels.issueStatus, d.to) });
      case "verification.record":
        return t("action.verification_record", { outcome: label(labels.outcome, d.outcome) });
      case "imagery.upload":
        return t("action.imagery_upload", { count: Number(d.count ?? 0) });
      case "directive.status":
        return t("action.directive_status", { from: label(labels.directiveStatus, d.from), to: label(labels.directiveStatus, d.to) });
      case "user.create":
        return t("action.user_create", { role: labels.role[d.role as RoleKey] ?? String(d.role) });
      case "user.update": {
        const fields = Object.keys((d.changes as object) ?? {});
        return fields.length ? t("action.user_update_fields", { fields: list(fields) }) : t("action.user_update");
      }
      case "user.projects":
        return t("action.user_projects", { added: Number(d.added ?? 0), removed: Number(d.removed ?? 0) });
      case "role.update": {
        const parts = [
          ...((d.added as string[]) ?? []).map((p) => `+${PERMISSION_LABEL[p] ?? p}`),
          ...((d.removed as string[]) ?? []).map((p) => `−${PERMISSION_LABEL[p] ?? p}`),
        ];
        return parts.length ? t("action.role_update_parts", { parts: list(parts) }) : t("action.role_update");
      }
      default:
        return action;
    }
  };
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
  const [projects, directives, users, labels, locale] = await Promise.all([
    db.project.findMany({
      where: { id: { in: ids("Project") } },
      select: { id: true, name: true, nameLocal: true, district: { select: { state: { select: { code: true } } } } },
    }),
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
    getLabels(),
    getLocale(),
  ]);
  const roles = await db.role.findMany({ select: { id: true, key: true } });

  const map = new Map<string, { label: string; href: string | null; stateCode: StateCode | null }>();
  for (const p of projects) {
    const code = p.district.state.code as StateCode;
    map.set(`Project:${p.id}`, { label: localName(locale, p.name, p.nameLocal), href: `${stateBasePath(portal, code)}/project/${p.id}`, stateCode: code });
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
  for (const r of roles) map.set(`Role:${r.id}`, { label: labels.role[r.key as RoleKey] ?? r.key, href: portal.kind === "admin" ? "/admin/roles" : null, stateCode: null });
  return map;
}

export async function queryAudit(f: AuditFilters, scopeState: StateCode | null, portal: Portal, { all = false } = {}) {
  const where = await buildWhere(f, scopeState);
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: { select: { key: true } } } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: all ? 0 : (f.page - 1) * AUDIT_PAGE_SIZE,
      take: all ? CSV_LIMIT : AUDIT_PAGE_SIZE,
    }),
  ]);
  const [targets, summarize, labels] = await Promise.all([resolveTargets(entries, portal), getSummarizer(), getLabels()]);

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
      actor: e.user ? { id: e.user.id, name: e.user.name, role: labels.role[e.user.role.key as RoleKey] ?? e.user.role.key } : null,
      summary: summarize(e.action, e.details),
      target: target ? { label: target.label, href } : null,
      stateCode: target?.stateCode ?? portalCode,
      details,
    };
  });
  return { rows, total, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}

/** People to offer in the "who" filter: everyone (admin) or the state's users. */
export async function auditUserOptions(scopeState: StateCode | null) {
  const [users, labels] = await Promise.all([
    db.user.findMany({
      where: scopeState ? { state: { code: scopeState } } : {},
      select: { id: true, name: true, role: { select: { key: true } } },
      orderBy: { name: "asc" },
    }),
    getLabels(),
  ]);
  return users.map((u) => ({ id: u.id, name: u.name, role: labels.role[u.role.key as RoleKey] ?? u.role.key }));
}
