import type { NextRequest } from "next/server";
import { can, getCurrentUser } from "@/lib/auth/dal";
import { parseAuditFilters, queryAudit } from "@/lib/audit";
import { STATES } from "@/config/states";
import { toDateInput } from "@/lib/dates";
import { formatDateTime } from "@/lib/format";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";

/**
 * The audit log as CSV, with the same filters as the page. The Admin can export
 * everything (optionally one state); a user with "View activity log" only ever
 * gets their own state, whatever the query string says. /api isn't covered by
 * Proxy, so this checks access itself.
 */
const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return NOT_FOUND();
  const isAdmin = user.roleKey === "ADMIN" && can(user, "users.manage");
  if (!isAdmin && !(can(user, "audit.view") && user.stateCode)) return NOT_FOUND();

  const filters = parseAuditFilters(Object.fromEntries(request.nextUrl.searchParams));
  const scopeState = isAdmin ? null : user.stateCode;
  const { rows } = await queryAudit(filters, scopeState, user.portal, { all: true });

  const [t, tc, locale] = await Promise.all([getTranslations("activity.csv"), getTranslations("common"), getLocale()]);
  const header = [t("time"), t("who"), t("role"), t("what"), t("target"), t("state"), t("action"), t("details")];
  const lines = rows.map((r) => [
    formatDateTime(r.at, locale),
    r.actor?.name ?? (r.failed ? tc("unknown") : tc("system")),
    r.actor?.role ?? "",
    r.summary,
    r.target?.label ?? "",
    r.stateCode ? localName(locale, STATES[r.stateCode].name, STATES[r.stateCode].nameLocal) : "",
    r.action,
    Object.keys(r.details).length ? JSON.stringify(r.details) : "",
  ]);
  const csv = "﻿" + [header, ...lines].map((cols) => cols.map(cell).join(",")).join("\r\n") + "\r\n";
  const name = `audit-log-${(scopeState ?? filters.state ?? "all").toLowerCase()}-${toDateInput(new Date())}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Quotes a CSV cell and defuses spreadsheet formulas (=, +, -, @ at the start). */
function cell(value: string) {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${v.replaceAll('"', '""')}"`;
}
