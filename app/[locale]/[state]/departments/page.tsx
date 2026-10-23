import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { GroupCard } from "@/components/browse/group-card";
import { requireStateAccess } from "@/lib/auth/dal";
import { getDepartmentCards } from "@/lib/data/projects";
import { formatBudget } from "@/lib/format";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { localName, localNames } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("browse"))("departmentsTitle") };
}

type Params = PageProps<"/[locale]/[state]/departments">;

export default function DepartmentsPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Departments params={params} />
      </Suspense>
    </main>
  );
}

async function Departments({ params }: { params: Params["params"] }) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const [cards, t, locale] = await Promise.all([
    getDepartmentCards(user, state),
    getTranslations("browse"),
    getLocale() as Promise<Locale>,
  ]);
  const withProjects = cards.filter((c) => c.counts.total > 0);
  const others = cards.filter((c) => c.counts.total === 0);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("departmentsTitle") },
        ]}
      />
      <PageHeader
        title={t("departmentsTitle")}
        subtitle={t("departmentsSummary", { count: cards.length })}
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {withProjects.map((d) => {
          const name = localNames(locale, d.name, d.nameLocal);
          return (
            <li key={d.code} className="grid">
              <GroupCard
                href={`${basePath}/projects?dept=${d.slug}`}
                title={name.primary}
                titleSecondary={name.secondary}
                meta={t("deptMeta", {
                  budget: formatBudget(d.budgetLakhs, locale),
                  count: d.districts,
                })}
                health={d.health}
                counts={d.counts}
                latestImage={d.latestImage}
              />
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("otherDepartments", { count: others.length })}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {others.map((d) => (
              <Link
                key={d.code}
                href={`${basePath}/projects?dept=${d.slug}`}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
              >
                {localName(locale, d.name, d.nameLocal)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
