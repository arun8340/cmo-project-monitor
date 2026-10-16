import Link from "next/link";
import Form from "next/form";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchXIcon, ShieldAlertIcon } from "lucide-react";
import { AutoSubmitSelect } from "@/components/workflow/auto-submit-select";
import { FilterChips, withParams } from "@/components/workflow/filter-chips";
import { AUDIT_CATEGORIES, AUDIT_PAGE_SIZE, auditUserOptions, queryAudit, type AuditCategory, type AuditFilters, type AuditRow } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { STATES, STATE_CODES, type StateCode } from "@/config/states";
import type { Portal } from "@/config/portals";

const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";

/** Query-string form of the filters (shared by links, pagination and the CSV export). */
export function auditParams(f: AuditFilters, over: Partial<AuditFilters> = {}) {
  const v = { ...f, ...over };
  return {
    from: v.from,
    to: v.to,
    user: v.user,
    cat: v.cat,
    state: v.state?.toLowerCase(),
    failed: v.failed && "1",
    page: v.page > 1 && String(v.page),
  };
}

/**
 * The audit log list with its filters. `scopeState` fixes it to one state (a
 * state's activity log); null shows every state with a state filter (admin).
 */
export async function AuditLogView({
  filters: f,
  scopeState,
  portal,
  listPath,
  csvPath,
}: {
  filters: AuditFilters;
  scopeState: StateCode | null;
  portal: Portal;
  listPath: string;
  csvPath: string;
}) {
  const [{ rows, total, pages }, users] = await Promise.all([queryAudit(f, scopeState, portal), auditUserOptions(scopeState)]);
  const link = (over: Partial<AuditFilters>) => withParams(listPath, auditParams(f, { page: 1, ...over }));
  const categories = Object.keys(AUDIT_CATEGORIES) as AuditCategory[];
  const page = Math.min(f.page, pages);

  return (
    <div className="grid gap-4">
      <FilterChips
        label="Filter by category"
        chips={[
          { key: "all", label: "Everything", href: link({ cat: null, failed: false }), active: !f.cat && !f.failed },
          ...categories.map((c) => ({
            key: c,
            label: AUDIT_CATEGORIES[c].label,
            href: link({ cat: c, failed: false }),
            active: f.cat === c && !f.failed,
          })),
          { key: "failed", label: "Failed sign-ins", href: link({ failed: true, cat: null }), active: f.failed, tone: "danger" as const },
        ]}
      />

      <Form action={listPath} className="flex flex-wrap items-end gap-2" aria-label="Filter the log">
        {f.cat && <input type="hidden" name="cat" value={f.cat} />}
        {f.failed && <input type="hidden" name="failed" value="1" />}
        <label className="grid gap-1 text-xs text-muted-foreground">
          From
          <input type="date" name="from" defaultValue={f.from ?? ""} className={`${selectClass} text-foreground`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          To
          <input type="date" name="to" defaultValue={f.to ?? ""} className={`${selectClass} text-foreground`} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Who
          <AutoSubmitSelect name="user" defaultValue={f.user ?? ""} className={`${selectClass} max-w-64 text-foreground`}>
            <option value="">Anyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        {!scopeState && (
          <label className="grid gap-1 text-xs text-muted-foreground">
            State
            <AutoSubmitSelect name="state" defaultValue={f.state?.toLowerCase() ?? ""} className={`${selectClass} text-foreground`}>
              <option value="">All states</option>
              {STATE_CODES.map((c) => (
                <option key={c} value={c.toLowerCase()}>
                  {STATES[c].name}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
        )}
        <button type="submit" className="h-9 rounded-lg border bg-background px-3 text-sm hover:bg-muted">
          Apply
        </button>
        {(f.from || f.to || f.user || f.state || f.cat || f.failed) && (
          <Link href={listPath} className="h-9 rounded-lg px-3 text-sm leading-9 text-muted-foreground hover:text-foreground">
            Clear
          </Link>
        )}
        <a
          href={withParams(csvPath, auditParams(f, { page: 1, state: scopeState ?? f.state }))}
          className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm hover:bg-muted"
          download
        >
          <DownloadIcon className="size-4" />
          Download CSV
        </a>
      </Form>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? "No entries" : `${(page - 1) * AUDIT_PAGE_SIZE + 1}–${Math.min(page * AUDIT_PAGE_SIZE, total)} of ${total.toLocaleString("en-IN")} entries, newest first`}
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
          <SearchXIcon className="size-6 text-muted-foreground" />
          <p className="font-medium">Nothing in the log matches</p>
          <Link href={listPath} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            Clear filters
          </Link>
        </div>
      ) : (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((r) => (
            <AuditEntry key={r.id} row={r} showState={!scopeState} userHref={portal.kind === "admin"} />
          ))}
        </ol>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-2 text-sm">
          {page > 1 ? (
            <Link href={link({ page: page - 1 })} className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 hover:bg-muted">
              <ChevronLeftIcon className="size-4" /> Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link({ page: page + 1 })} className="flex items-center gap-1 rounded-lg border bg-background px-3 py-1.5 hover:bg-muted">
              Older <ChevronRightIcon className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function AuditEntry({ row: r, showState, userHref }: { row: AuditRow; showState: boolean; userHref: boolean }) {
  const hasDetails = Object.keys(r.details).length > 0;
  return (
    <li className={`grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-4 ${r.failed ? "bg-red-50/60" : ""}`}>
      <time dateTime={r.at.toISOString()} className="text-xs whitespace-nowrap text-muted-foreground sm:pt-0.5">
        {formatDateTime(r.at)}
      </time>
      <div className="grid min-w-0 gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {r.failed && <ShieldAlertIcon className="size-3.5 shrink-0 self-center text-red-700" aria-label="Failed" />}
          {r.actor ? (
            userHref ? (
              <Link href={`/admin/users/${r.actor.id}`} className="font-medium hover:underline">
                {r.actor.name}
              </Link>
            ) : (
              <span className="font-medium">{r.actor.name}</span>
            )
          ) : (
            <span className="font-medium text-muted-foreground">{r.failed ? "Unknown" : "System"}</span>
          )}
          <span className={r.failed ? "text-red-800" : ""}>{r.summary}</span>
        </div>
        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {r.actor && <span>{r.actor.role}</span>}
          {r.target && r.target.label !== r.actor?.name && (
            <span className="min-w-0 truncate">
              ·{" "}
              {r.target.href ? (
                <Link href={r.target.href} className="text-foreground hover:underline">
                  {r.target.label}
                </Link>
              ) : (
                r.target.label
              )}
            </span>
          )}
          {showState && r.stateCode && <span>· {STATES[r.stateCode].name}</span>}
        </div>
        {hasDetails && (
          <details className="group mt-1 text-xs">
            <summary className="w-fit cursor-pointer text-muted-foreground hover:text-foreground">Details</summary>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/60 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(r.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </li>
  );
}
