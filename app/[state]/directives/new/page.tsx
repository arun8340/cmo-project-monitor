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

export const metadata: Metadata = { title: "Issue directive" };

type Params = PageProps<"/[state]/directives/new">;

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
  const back = project ? `${basePath}/project/${project.id}` : `${basePath}/directives`;

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: state.name, href: basePath || "/" }, { label: "Directives", href: `${basePath}/directives` }, { label: "Issue directive" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Issue directive</h1>
        <p className="mt-1 text-sm text-muted-foreground">The responsible officer will see it in their directives and must respond before the due date.</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DirectiveForm stateSlug={state.code.toLowerCase()} options={options} initial={initial} today={todayIST()} cancelHref={back} />
      </div>
    </div>
  );
}
