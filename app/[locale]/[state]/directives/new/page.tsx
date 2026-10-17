import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { DirectiveForm } from "@/components/directives/directive-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canIssueDirective } from "@/lib/auth/project-permissions";
import { getDirectiveFormOptions } from "@/lib/data/directives";
import { todayIST } from "@/lib/dates";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("directives"))("issue") };
}

type Params = PageProps<"/[locale]/[state]/directives/new">;

export default function NewDirectivePage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <NewDirective params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewDirective({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canIssueDirective(user)) notFound();
  const options = await getDirectiveFormOptions(user, state);

  // Optional prefill from a project page (?project=<id>).
  const project = options.projects.find((p) => p.id === sp.project);
  const initial = project ? { project: project.id, district: project.district, department: project.dept } : {};
  const [t, locale] = await Promise.all([getTranslations("directives"), getLocale()]);
  const back = project ? `${basePath}/project/${project.id}` : `${basePath}/directives`;

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: t("title"), href: `${basePath}/directives` },
          { label: t("issue") },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("issue")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newIntro")}</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DirectiveForm stateSlug={state.code.toLowerCase()} options={options} initial={initial} today={todayIST()} cancelHref={back} />
      </div>
    </div>
  );
}
