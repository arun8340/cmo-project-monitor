import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { RequestForm } from "@/components/requests/request-form";
import { requireStateAccess } from "@/lib/auth/dal";
import { canRequestImagery } from "@/lib/auth/project-permissions";
import { getRequestableProjects } from "@/lib/data/requests";
import { todayIST } from "@/lib/dates";
import { meetingDayAtLeast } from "@/lib/meeting-slots";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("requests"))("new") };
}

type Params = PageProps<"/[locale]/[state]/requests/new">;

export default function NewRequestPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <NewRequest params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewRequest({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Params["searchParams"];
}) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canRequestImagery(user)) notFound();
  // Default: in time for the next CMO meeting at least 3 days away.
  const meetingDay = meetingDayAtLeast(3);
  const [projects, t, locale] = await Promise.all([
    getRequestableProjects(user, state),
    getTranslations("requests"),
    getLocale(),
  ]);
  const initial =
    typeof sp.project === "string" && projects.some((p) => p.id === sp.project)
      ? sp.project
      : "";
  const back = initial
    ? `${basePath}/project/${initial}`
    : `${basePath}/requests`;

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title"), href: `${basePath}/requests` },
          { label: t("new") },
        ]}
      />
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">
          {t("new")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newIntro")}</p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <RequestForm
          stateSlug={state.code.toLowerCase()}
          projects={projects.map((p) => ({
            id: p.id,
            label: `${localName(locale, p.name, p.nameLocal)} (${p.district})${p.hasImagery ? "" : ` · ${t("noImageryYet")}`}`,
          }))}
          initialProject={initial}
          isCmo={user.roleKey === "CMO"}
          defaultNeededBy={meetingDay}
          today={todayIST()}
          cancelHref={back}
        />
      </div>
    </div>
  );
}
