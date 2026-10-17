import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { DirectiveStatusBadge } from "@/components/workflow/badges";
import { StatusChange } from "@/components/workflow/status-change";
import { Timeline } from "@/components/workflow/timeline";
import { OnceToast } from "@/components/workflow/once-toast";
import { requireStateAccess } from "@/lib/auth/dal";
import { getDirective } from "@/lib/data/directives";
import type { DirectiveStatus } from "@/lib/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";
import { daysBetween, formatDate } from "@/lib/format";
import { directiveTransitions, OPEN_DIRECTIVE_STATUSES } from "@/lib/workflow";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("directives"))("directive") };
}

type Params = PageProps<"/[locale]/[state]/directives/[id]">;

export default function DirectivePage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Directive params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Directive({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, id }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const d = await getDirective(user, state, id);
  if (!d) notFound();

  const status = d.status as DirectiveStatus;
  const now = new Date();
  const overdue = OPEN_DIRECTIVE_STATUSES.includes(status) && !!d.dueDate && d.dueDate < now;
  const daysLeft = d.dueDate ? daysBetween(now, d.dueDate) : null;
  const transitions = directiveTransitions(user, status, d.ownerId);
  const [t, labels, locale] = await Promise.all([getTranslations("directives"), getLabels(), getLocale()]);

  return (
    <div className="grid gap-5">
      {sp.issued === "1" && <OnceToast message={t("issued")} />}
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: t("title"), href: `${basePath}/directives` },
          { label: t("directive") },
        ]}
      />

      <section className={`grid gap-4 rounded-xl border bg-card p-5 ${overdue ? "border-l-4 border-l-red-600" : ""}`}>
        <DirectiveStatusBadge status={status} overdue={overdue} />
        <h1 className="text-xl leading-snug font-semibold">{d.text}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Fact label={t("directedTo")}>
            {d.project ? (
              <Link href={`${basePath}/project/${d.project.id}`} className="hover:underline">
                {d.target}
              </Link>
            ) : (
              d.target
            )}
          </Fact>
          <Fact label={t("owner")}>{d.owner ? `${d.owner.name}${d.owner.designation ? ` (${d.owner.designation})` : ""}` : "—"}</Fact>
          <Fact label={t("issuedBy")}>
            {d.fromUser.name} · {formatDate(d.createdAt, locale)}
          </Fact>
          <Fact label={t("due")}>
            {d.dueDate ? (
              <span className={overdue ? "font-semibold text-red-700" : ""}>
                {formatDate(d.dueDate, locale)}
                {OPEN_DIRECTIVE_STATUSES.includes(status) && daysLeft != null && (
                  <> · {overdue ? t("overdueByLower", { count: -daysLeft }) : daysLeft === 0 ? t("dueTodayLower") : t("daysLeft", { count: daysLeft })}</>
                )}
              </span>
            ) : (
              "—"
            )}
          </Fact>
        </dl>
        {transitions.length > 0 && (
          <div className="border-t pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {transitions.some((tr) => tr.to === "COMPLIED") ? t("respond") : t("review")}
            </div>
            <StatusChange kind="directive" id={d.id} stateSlug={state.code.toLowerCase()} transitions={transitions} />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 font-medium">
          {t("history")}
        </h2>
        <Timeline entries={d.updates} labels={labels.directiveStatus} createdVerb={t("issued")} />
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
