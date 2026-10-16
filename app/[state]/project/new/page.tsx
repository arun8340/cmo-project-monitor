import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { ProjectForm } from "@/components/project/project-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canCreateProject } from "@/lib/auth/project-permissions";
import { getProjectFormOptions } from "@/lib/data/project";

export const metadata: Metadata = { title: "Add project" };

type Params = PageProps<"/[state]/project/new">;

export default function NewProjectPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <NewProject params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewProject({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canCreateProject(user)) notFound();

  const options = await getProjectFormOptions(user, state);
  if (options.districts.length === 0 || options.departments.length === 0) notFound();

  const want = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : undefined);
  const district = options.districts.find((d) => d.slug === want(sp.district)) ?? options.districts[0];
  const department = options.departments.find((d) => d.code.toLowerCase() === want(sp.dept)) ?? options.departments[0];
  const back = want(sp.district) ? `${basePath}/district/${district.slug}${want(sp.dept) ? `/${department.code.toLowerCase()}` : ""}` : basePath || "/";

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: district.name, href: `${basePath}/district/${district.slug}` },
          { label: "Add project" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add project</h1>
        <p className="mt-1 text-sm text-muted-foreground">New work in {state.name}. You can upload imagery once the project is created.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <ProjectForm
          mode="create"
          stateSlug={state.code.toLowerCase()}
          initial={{ district: district.slug, department: department.code.toLowerCase(), status: "NOT_STARTED" }}
          districts={options.districts}
          departments={options.departments}
          cancelHref={back}
          accent={state.theme.primary}
        />
      </div>
    </div>
  );
}
