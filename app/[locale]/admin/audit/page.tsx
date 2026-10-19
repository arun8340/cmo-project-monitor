import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrollTextIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogView } from "@/components/audit/audit-log-view";
import { requireAdmin } from "@/lib/auth/dal";
import { parseAuditFilters } from "@/lib/audit";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage({ searchParams }: PageProps<"/[locale]/admin/audit">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold tracking-tight text-navy [&>svg]:hidden">
          <ScrollTextIcon className="size-6 text-muted-foreground" />
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Every sign-in, change and upload across both states, with who did it and when.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Audit({ searchParams }: { searchParams: PageProps<"/[locale]/admin/audit">["searchParams"] }) {
  const user = await requireAdmin();
  const filters = parseAuditFilters(await searchParams);
  return <AuditLogView filters={filters} scopeState={null} portal={user.portal} listPath="/admin/audit" csvPath="/api/audit/csv" />;
}
