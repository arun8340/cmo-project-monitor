import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { PageHeader } from "@/components/app-shell/page-parts";
import { RequestType } from "@/components/requests/request-bits";
import { VendorForm, VendorToggle } from "@/components/requests/vendor-forms";
import { pill, TONE_PILL } from "@/components/workflow/badges";
import { requireStateAccess } from "@/lib/auth/dal";
import { canProcessRequests } from "@/lib/auth/project-permissions";
import { listVendors } from "@/lib/data/requests";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("suppliers"))("title") };
}

type Params = PageProps<"/[locale]/[state]/requests/suppliers">;

export default function SuppliersPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[480px] w-full" />}>
        <Suppliers params={params} />
      </Suspense>
    </main>
  );
}

/** DoIT: the suppliers it orders imagery from. */
async function Suppliers({ params }: { params: Params["params"] }) {
  const { state: stateParam } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  if (!canProcessRequests(user)) notFound();
  const [vendors, t, tr, locale] = await Promise.all([listVendors(state), getTranslations("suppliers"), getTranslations("requests"), getLocale()]);
  const stateSlug = state.code.toLowerCase();

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: tr("title"), href: `${basePath}/requests` },
          { label: t("title") },
        ]}
      />
      <PageHeader title={t("title")} subtitle={t("intro")} actions={<VendorForm stateSlug={stateSlug} />} />
      <ul className="grid gap-3">
        {vendors.map((v) => (
          <li key={v.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 ${v.active ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-navy">{v.name}</span>
                <RequestType type={v.type} />
                {!v.active && <span className={`${pill} ${TONE_PILL.muted}`}>{t("inactive")}</span>}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {tr("turnaround", { days: v.turnaroundDays })} · {t("orders", { count: v.orders })}
                {v.contact && <> · {v.contact}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <VendorForm stateSlug={stateSlug} vendor={v} />
              <VendorToggle stateSlug={stateSlug} id={v.id} active={v.active} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
