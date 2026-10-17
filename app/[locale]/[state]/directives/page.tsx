import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { PlusIcon, ScrollTextIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { FilterChips, withParams } from "@/components/workflow/filter-chips";
import { DirectiveStatusBadge } from "@/components/workflow/badges";
import { AutoSubmitSelect } from "@/components/workflow/auto-submit-select";
import { requireStateAccess } from "@/lib/auth/dal";
import { canIssueDirective } from "@/lib/auth/project-permissions";
import { listDirectives, parseDirectiveFilters, type DirectiveFilters, type DirectiveTab } from "@/lib/data/directives";
import { daysBetween, formatDate } from "@/lib/format";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("directives"))("title") };
}

type Params = PageProps<"/[locale]/[state]/directives">;

export default function DirectivesPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Directives params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const TABS: DirectiveTab[] = ["open", "overdue", "complied", "closed", "all"];
type DT = Awaited<ReturnType<typeof getTranslations<"directives">>>;
const selectClass = "h-9 rounded-lg border bg-background px-2 text-sm";

function dueText(due: Date | null, overdue: boolean, now: Date, t: DT, locale: Locale) {
  if (!due) return { text: t("noDueDate"), danger: false };
  const n = daysBetween(now, due);
  if (overdue) return { text: t("overdueBy", { count: -n }), danger: true };
  if (n === 0) return { text: t("dueToday"), danger: false };
  if (n > 0) return { text: t("dueIn", { count: n }), danger: false };
  return { text: t("dueOn", { date: formatDate(due, locale) }), danger: false };
}

async function Directives({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const f = parseDirectiveFilters(sp);
  const { rows, counts, options } = await listDirectives(user, state, f);
  const listPath = `${basePath}/directives`;
  const now = new Date();
  const [t, locale] = await Promise.all([getTranslations("directives"), getLocale()]);
  const link = (over: Partial<DirectiveFilters>) => {
    const v = { ...f, ...over };
    return withParams(listPath, { tab: v.tab === "open" ? null : v.tab, district: v.district, dept: v.dept, mine: v.mine ? "1" : null });
  };

  return (
    <div className="grid gap-5">
      <Breadcrumbs items={[{ label: localName(locale, state.name, state.nameLocal), href: basePath || "/" }, { label: t("title") }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ScrollTextIcon className="size-6 text-muted-foreground" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        {canIssueDirective(user) && (
          <Button nativeButton={false} render={<Link href={`${listPath}/new`} />}>
            <PlusIcon />
            {t("issue")}
          </Button>
        )}
      </div>

      <FilterChips
        label={t("filter")}
        chips={TABS.map((tab) => ({
          key: tab,
          label: t(`tab.${tab}`),
          count: counts[tab],
          href: link({ tab }),
          active: f.tab === tab,
          tone: tab === "overdue" ? "danger" : undefined,
        }))}
      />

      <Form action={listPath} className="flex flex-wrap items-center gap-2">
        {f.tab !== "open" && <input type="hidden" name="tab" value={f.tab} />}
        {options.districts.length > 1 && (
          <AutoSubmitSelect name="district" defaultValue={f.district ?? ""} className={selectClass} aria-label={t("district")}>
            <option value="">{t("allDistricts")}</option>
            {options.districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </AutoSubmitSelect>
        )}
        {options.departments.length > 1 && (
          <AutoSubmitSelect name="dept" defaultValue={f.dept ?? ""} className={selectClass} aria-label={t("department")}>
            <option value="">{t("allDepartments")}</option>
            {options.departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </AutoSubmitSelect>
        )}
        <Link
          href={link({ mine: !f.mine })}
          aria-pressed={f.mine}
          className={`flex h-9 items-center rounded-lg border px-3 text-sm ${f.mine ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted"}`}
        >
          {t("mine")}
        </Link>
      </Form>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-14 text-center">
          <SearchXIcon className="size-6 text-muted-foreground" />
          <p className="font-medium">{t("none")}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const due = dueText(r.dueDate, r.overdue, now, t, locale);
            return (
              <li key={r.id}>
                <Link
                  href={`${listPath}/${r.id}`}
                  className={`grid gap-2 rounded-xl border bg-card p-4 transition hover:shadow-sm ${r.overdue ? "border-l-4 border-l-red-600" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="max-w-3xl font-medium">{r.text}</p>
                    <DirectiveStatusBadge status={r.status} overdue={r.overdue} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="text-foreground">{t("toLabel")}</span> {r.target}
                    </span>
                    <span>
                      <span className="text-foreground">{t("ownerLabel")}</span> {r.owner ?? "—"}
                    </span>
                    <span>
                      <span className="text-foreground">{t("fromLabel")}</span> {r.from} · {formatDate(r.createdAt, locale)}
                    </span>
                    <span className={due.danger ? "font-medium text-red-700" : ""}>{due.text}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
