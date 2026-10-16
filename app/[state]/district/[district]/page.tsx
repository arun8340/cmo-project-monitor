import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { requireStateAccess } from "@/lib/auth/dal";
import { districtScope, projectScope } from "@/lib/auth/scope";
import { geoCodeFromSlug } from "@/lib/district-slug";

/** Placeholder district view (step 3). Step 4 replaces it with department cards. */
export default function DistrictPage({ params }: PageProps<"/[state]/district/[district]">) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <District params={params} />
      </Suspense>
    </main>
  );
}

async function District({ params }: { params: PageProps<"/[state]/district/[district]">["params"] }) {
  const { state: stateParam, district: slug } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);

  const district = await db.district.findFirst({
    where: { AND: [districtScope(user, state.code), { geoCode: geoCodeFromSlug(state.code, slug) }] },
  });
  if (!district) notFound();

  const projects = await db.project.count({ where: { AND: [projectScope(user, state.code), { districtId: district.id }] } });

  return (
    <div className="grid gap-4">
      <Link href={basePath || "/"} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" />
        {state.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {district.name} <span className="font-normal text-muted-foreground">{district.nameLocal}</span>
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{projects} projects in your view</CardTitle>
          <CardDescription>Department cards for this district arrive in the next build step.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
