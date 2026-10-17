import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { ProjectForm } from "@/components/project/project-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canCreateProject } from "@/lib/auth/project-permissions";
import { getProjectFormOptions } from "@/lib/data/project";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("projectForm"))("newTitle") };
}

type Params = PageProps<"/[locale]/[state]/project/new">;

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
  const [t, locale] = await Promise.all([getTranslations("projectForm"), getLocale()]);
  const stateName = localName(locale, state.name, state.nameLocal);
  const back = want(sp.district) ? `${basePath}/district/${district.slug}${want(sp.dept) ? `/${department.code.toLowerCase()}` : ""}` : basePath || "/";

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: stateName, href: basePath || "/" },
          { label: localName(locale, district.name, district.nameLocal), href: `${basePath}/district/${district.slug}` },
          { label: t("newTitle") },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newIntro", { scope: stateName })}</p>
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
