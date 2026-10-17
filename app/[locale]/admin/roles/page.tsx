import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RolePermissionsForm } from "@/components/admin/role-permissions-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ADMIN_ONLY_PERMISSIONS, PERMISSION_GROUPS, PERMISSIONS, ROLE_KEYS } from "@/lib/constants";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheckIcon className="size-6 text-muted-foreground" />
          Roles &amp; permissions
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          What each role may do. Which data a person sees is set by their scope (state, district, department or assigned projects) on their user page, and is
          always enforced on the server.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <Roles />
      </Suspense>
    </main>
  );
}

async function Roles() {
  await requireAdmin();
  const roles = await db.role.findMany({ include: { _count: { select: { users: { where: { active: true } } } } } });
  const ordered = ROLE_KEYS.map((k) => roles.find((r) => r.key === k)).filter((r) => !!r);
  return (
    <RolePermissionsForm
      groups={PERMISSION_GROUPS}
      adminOnly={ADMIN_ONLY_PERMISSIONS}
      roles={ordered.map((r) => {
        let stored: string[] = [];
        try {
          stored = JSON.parse(r.permissions);
        } catch {}
        return {
          key: r.key,
          name: r.name,
          users: r._count.users,
          permissions: r.key === "ADMIN" ? [...PERMISSIONS] : stored,
        };
      })}
    />
  );
}
