import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InboxIcon, SatelliteDishIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { FilterChips, withParams } from "@/components/workflow/filter-chips";
import { RequestCard } from "@/components/requests/request-bits";
import { requireStateAccess } from "@/lib/auth/dal";
import {
  canProcessRequests,
  canRequestImagery,
} from "@/lib/auth/project-permissions";
import {
  listRequests,
  parseRequestFilters,
  type RequestFilters,
  type RequestTab,
} from "@/lib/data/requests";
import { IMAGERY_SOURCES } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("requests"))("title") };
}

type Params = PageProps<"/[locale]/[state]/requests">;

export default function RequestsPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Requests params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Imagery requests: DoIT's work queue, or (for everyone else) the requests in their view. */
async function Requests({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Params["searchParams"];
}) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const f = parseRequestFilters(sp);
  const { rows, counts } = await listRequests(user, state, f);
  const [t, labels, locale] = await Promise.all([
    getTranslations("requests"),
    getLabels(),
    getLocale(),
  ]);
  const doit = canProcessRequests(user);
  const path = `${basePath}/requests`;
  const link = (over: Partial<RequestFilters>) => {
    const v = { ...f, ...over };
    return withParams(path, {
      tab: v.tab === "open" ? null : v.tab,
      type: v.type?.toLowerCase(),
      mine: v.mine ? "1" : null,
    });
  };
  const TABS: RequestTab[] = doit
    ? ["new", "review", "open", "approved", "closed", "all"]
    : ["open", "approved", "closed", "all"];

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title") },
        ]}
      />
      <PageHeader
        title={doit ? t("titleDoit") : t("title")}
        subtitle={doit ? t("introDoit") : t("intro")}
        actions={
          canRequestImagery(user) && (
            <Button nativeButton={false} render={<Link href={`${path}/new`} />}>
              <SatelliteDishIcon />
              {t("new")}
            </Button>
          )
        }
      />
      <div className="grid gap-2">
        <FilterChips
          label={t("filterByStatus")}
          chips={TABS.map((k) => ({
            key: k,
            label: t(`tab.${k}`),
            count: counts[k],
            href: link({ tab: k }),
            active: f.tab === k,
          }))}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FilterChips
            label={t("filterByType")}
            chips={[
              {
                key: "any",
                label: t("anyType"),
                href: link({ type: null }),
                active: !f.type,
              },
              ...IMAGERY_SOURCES.map((s) => ({
                key: s,
                label: labels.source[s],
                href: link({ type: s }),
                active: f.type === s,
              })),
            ]}
          />
          <Link
            href={link({ mine: !f.mine })}
            scroll={false}
            aria-pressed={f.mine}
            className={`rounded-full border px-3 py-1.5 ${f.mine ? "border-navy bg-navy font-semibold text-white" : "bg-card hover:bg-muted"}`}
          >
            {t("onlyMine")}
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          <InboxIcon className="size-6" />
          {t("none")}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} basePath={basePath} />
          ))}
        </ul>
      )}
    </div>
  );
}
