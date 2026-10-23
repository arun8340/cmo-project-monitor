import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { GroupCard } from "@/components/browse/group-card";
import { requireStateAccess } from "@/lib/auth/dal";
import { getDistrictCards } from "@/lib/data/projects";
import { getLocale, getTranslations } from "next-intl/server";
import { localName, localNames } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("browse"))("districtsTitle") };
}

type Params = PageProps<"/[locale]/[state]/districts">;

export default function DistrictsPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Districts params={params} />
      </Suspense>
    </main>
  );
}

async function Districts({ params }: { params: Params["params"] }) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const [cards, t, locale] = await Promise.all([
    getDistrictCards(user, state),
    getTranslations("browse"),
    getLocale(),
  ]);
  const withProjects = cards.filter((c) => c.counts.total > 0);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("districtsTitle") },
        ]}
      />
      <PageHeader
        title={t("districtsTitle")}
        subtitle={t("districtsSummary", { count: withProjects.length })}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withProjects.map((d) => {
          const name = localNames(locale, d.name, d.nameLocal);
          return (
            <li key={d.slug} className="grid">
              <GroupCard
                href={`${basePath}/district/${d.slug}`}
                title={name.primary}
                titleSecondary={name.secondary}
                health={d.health}
                counts={d.counts}
                latestImage={d.latestImage}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
