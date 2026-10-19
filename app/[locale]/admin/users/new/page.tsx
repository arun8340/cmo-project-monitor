import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { UserForm } from "@/components/admin/user-form";
import { requireAdmin } from "@/lib/auth/dal";
import { getScopeOptions, roleOptions } from "@/lib/data/users";

export const metadata: Metadata = { title: "Add user" };

export default function NewUserPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-6">
      <Breadcrumbs items={[{ label: "Users", href: "/admin/users" }, { label: "Add user" }]} />
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">The person signs in on their state&apos;s portal with the email and temporary password you set here.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <NewUser />
      </Suspense>
    </main>
  );
}

async function NewUser() {
  await requireAdmin();
  const scopes = await getScopeOptions();
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <UserForm
        mode="create"
        roles={roleOptions()}
        scopes={scopes}
        initial={{ name: "", email: "", designation: "", role: "DISTRICT_COLLECTOR", state: "", district: "", department: "" }}
      />
    </div>
  );
}
