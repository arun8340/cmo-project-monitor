import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { KeyRoundIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { OnceToast } from "@/components/workflow/once-toast";
import { UserForm } from "@/components/admin/user-form";
import { ActiveToggle, AssignProjectsForm, ResetPasswordForm } from "@/components/admin/user-actions";
import { requireAdmin } from "@/lib/auth/dal";
import { getScopeOptions, getUserForEdit, roleOptions } from "@/lib/data/users";
import { summarize } from "@/lib/audit";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "User" };

type Params = PageProps<"/admin/users/[id]">;

export default function UserPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[720px] w-full" />}>
        <UserDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

async function UserDetail({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const admin = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [data, scopes] = await Promise.all([getUserForEdit(id), getScopeOptions()]);
  if (!data) notFound();
  const { user, lastLogin, recent, districtProjects } = data;
  const isSelf = user.id === admin.id;
  const roleKey = user.role.key;

  return (
    <>
      {sp.created === "1" && <OnceToast message="User created — share the temporary password with them" />}
      <Breadcrumbs items={[{ label: "Users", href: "/admin/users" }, { label: user.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.role.name}
            {user.state && ` · ${user.state.name}`} · {user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {!user.active && <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-slate-700">Deactivated</span>}
          {user.mustChangePassword && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900">
              <KeyRoundIcon className="size-3" />
              Must choose a new password at next sign-in
            </span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Last sign-in</dt>
          <dd>{lastLogin ? formatDateTime(lastLogin) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Password last set</dt>
          <dd>{user.passwordChangedAt ? formatDate(user.passwordChangedAt) : "At account creation"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Account created</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd>{user.active ? "Active" : "Deactivated"}</dd>
        </div>
      </dl>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-5">
          <Section title="Details, role and scope">
            <UserForm
              mode="edit"
              userId={user.id}
              isSelf={isSelf}
              roles={roleOptions()}
              scopes={scopes}
              initial={{
                name: user.name,
                email: user.email,
                designation: user.designation ?? "",
                role: roleKey,
                state: user.state?.code ?? "",
                district: user.districtId ?? "",
                department: user.departmentId ?? "",
              }}
            />
          </Section>
          {roleKey === "FIELD_OFFICER" && (
            <Section
              title="Assigned projects"
              description={`A field officer only sees the projects assigned to them. Choose from ${user.district?.name ?? "their district"}'s projects.`}
            >
              {user.districtId ? (
                <AssignProjectsForm
                  key={user.districtId}
                  userId={user.id}
                  projects={districtProjects.map((p) => ({ id: p.id, name: p.name, department: p.department.name }))}
                  assigned={user.assignedProjects.map((p) => p.id)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Set the officer&apos;s district first.</p>
              )}
            </Section>
          )}
        </div>

        <div className="grid content-start gap-5">
          <Section title="Password">
            <ResetPasswordForm userId={user.id} isSelf={isSelf} />
          </Section>
          <Section title={user.active ? "Deactivate" : "Reactivate"}>
            <ActiveToggle userId={user.id} active={user.active} disabledReason={isSelf ? "You can't deactivate your own account." : null} />
          </Section>
          <Section title="Recent activity">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ol className="grid gap-2 text-sm">
                {recent.map((a) => (
                  <li key={a.id} className="grid">
                    <span>
                      {a.userId && a.userId !== user.id && <span className="text-muted-foreground">{a.user?.name}: </span>}
                      {summarize(a.action, a.details)}
                    </span>
                    <time className="text-xs text-muted-foreground" dateTime={a.createdAt.toISOString()}>
                      {formatDateTime(a.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
            <Link href={`/admin/audit?user=${user.id}`} className="text-sm text-primary hover:underline">
              Full activity in the audit log
            </Link>
          </Section>
        </div>
      </div>
    </>
  );
}
