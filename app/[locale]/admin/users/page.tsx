import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { KeyRoundIcon, SearchIcon, SearchXIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips, withParams } from "@/components/workflow/filter-chips";
import { AutoSubmitSelect } from "@/components/workflow/auto-submit-select";
import { requireAdmin } from "@/lib/auth/dal";
import { listUsers, parseUserFilters, type UserFilters } from "@/lib/data/users";
import { ROLE_DEFINITIONS, ROLE_KEYS } from "@/lib/constants";
import { STATES, STATE_CODES } from "@/config/states";
import { relativeDays } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight text-navy [&>svg]:hidden">
            <UsersIcon className="size-6 text-muted-foreground" />
            Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone who can sign in, their role and the data they can see.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/users/new" />}>
          <UserPlusIcon />
          Add user
        </Button>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Users searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";

/** "Jaipur" / "PWD" / "Whole state" — what part of the state the user sees. */
function scopeLabel(u: { roleKey: string; district: string | null; department: string | null; assignedProjects: number }) {
  switch (u.roleKey) {
    case "ADMIN":
      return "All states";
    case "CMO":
    case "DOIT":
      return "Whole state";
    case "DEPARTMENT_HEAD":
      return u.department ?? "No department set";
    case "DISTRICT_COLLECTOR":
      return u.district ?? "No district set";
    case "FIELD_OFFICER":
      return `${u.district ?? "No district"} · ${u.assignedProjects} project${u.assignedProjects === 1 ? "" : "s"}`;
    default:
      return "—";
  }
}

async function Users({ searchParams }: { searchParams: PageProps<"/[locale]/admin/users">["searchParams"] }) {
  await requireAdmin();
  const f = parseUserFilters(await searchParams);
  const { users, activeCount, inactiveCount } = await listUsers(f);
  const now = new Date();
  const link = (over: Partial<UserFilters>) => {
    const v = { ...f, ...over };
    return withParams("/admin/users", { status: v.status === "active" ? null : v.status, state: v.state?.toLowerCase(), role: v.role?.toLowerCase(), q: v.q });
  };

  return (
    <div className="grid gap-4">
      <FilterChips
        label="Filter by status"
        chips={[
          { key: "active", label: "Active", count: activeCount, href: link({ status: "active" }), active: f.status === "active" },
          { key: "inactive", label: "Deactivated", count: inactiveCount, href: link({ status: "inactive" }), active: f.status === "inactive" },
          { key: "all", label: "All", count: activeCount + inactiveCount, href: link({ status: "all" }), active: f.status === "all" },
        ]}
      />
      <Form action="/admin/users" className="flex flex-wrap items-center gap-2" role="search">
        {f.status !== "active" && <input type="hidden" name="status" value={f.status} />}
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Search name, email or designation…"
            aria-label="Search users"
            className="h-9 w-full rounded-lg border bg-background pr-3 pl-8 text-sm"
          />
        </div>
        <AutoSubmitSelect name="state" defaultValue={f.state?.toLowerCase() ?? ""} className={selectClass} aria-label="State">
          <option value="">All states</option>
          {STATE_CODES.map((c) => (
            <option key={c} value={c.toLowerCase()}>
              {STATES[c].name}
            </option>
          ))}
          <option value="none">No state (Admins)</option>
        </AutoSubmitSelect>
        <AutoSubmitSelect name="role" defaultValue={f.role?.toLowerCase() ?? ""} className={selectClass} aria-label="Role">
          <option value="">All roles</option>
          {ROLE_KEYS.map((r) => (
            <option key={r} value={r.toLowerCase()}>
              {ROLE_DEFINITIONS[r].name}
            </option>
          ))}
        </AutoSubmitSelect>
        <button type="submit" className="sr-only">
          Apply
        </button>
      </Form>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
          <SearchXIcon className="size-6 text-muted-foreground" />
          <p className="font-medium">No users match</p>
          <Link href="/admin/users" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-[#faf8f3] text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold">Scope</th>
                  <th className="px-4 py-3 font-semibold">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className={`align-top hover:bg-[#faf8f3] ${u.active ? "" : "text-muted-foreground"}`}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-foreground hover:underline">
                        {u.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      <UserFlags active={u.active} mustChangePassword={u.mustChangePassword} />
                    </td>
                    <td className="px-4 py-3">
                      {u.roleName}
                      {u.designation && <div className="max-w-60 truncate text-xs text-muted-foreground">{u.designation}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.state ?? "—"}</td>
                    <td className="px-4 py-3">{scopeLabel(u)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{u.lastLogin ? relativeDays(u.lastLogin, now) : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {users.map((u) => (
              <li key={u.id} className="grid gap-1 rounded-xl border bg-card p-4 text-sm">
                <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                  {u.name}
                </Link>
                <div className="text-xs text-muted-foreground">{u.email}</div>
                <div>
                  {u.roleName}
                  {u.state && ` · ${u.state}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {scopeLabel(u)} · last sign-in {u.lastLogin ? relativeDays(u.lastLogin, now) : "never"}
                </div>
                <UserFlags active={u.active} mustChangePassword={u.mustChangePassword} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function UserFlags({ active, mustChangePassword }: { active: boolean; mustChangePassword: boolean }) {
  if (active && !mustChangePassword) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {!active && <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Deactivated</span>}
      {mustChangePassword && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
          <KeyRoundIcon className="size-3" />
          Temporary password
        </span>
      )}
    </div>
  );
}
