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
import { DIRECTIVE_STATUS_LABELS, type DirectiveStatus } from "@/lib/constants";
import { daysBetween, formatDate } from "@/lib/format";
import { directiveTransitions, OPEN_DIRECTIVE_STATUSES } from "@/lib/workflow";

export const metadata: Metadata = { title: "Directive" };

type Params = PageProps<"/[state]/directives/[id]">;

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

  return (
    <div className="grid gap-5">
      {sp.issued === "1" && <OnceToast message="Directive issued" />}
      <Breadcrumbs items={[{ label: state.name, href: basePath || "/" }, { label: "Directives", href: `${basePath}/directives` }, { label: "Directive" }]} />

      <section className={`grid gap-4 rounded-xl border bg-card p-5 ${overdue ? "border-l-4 border-l-red-600" : ""}`}>
        <DirectiveStatusBadge status={status} overdue={overdue} />
        <h1 className="text-xl leading-snug font-semibold">{d.text}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Fact label="Directed to">
            {d.project ? (
              <Link href={`${basePath}/project/${d.project.id}`} className="hover:underline">
                {d.target}
              </Link>
            ) : (
              d.target
            )}
          </Fact>
          <Fact label="Responsible officer">{d.owner ? `${d.owner.name}${d.owner.designation ? ` (${d.owner.designation})` : ""}` : "—"}</Fact>
          <Fact label="Issued by">
            {d.fromUser.name} · {formatDate(d.createdAt)}
          </Fact>
          <Fact label="Due">
            {d.dueDate ? (
              <span className={overdue ? "font-semibold text-red-700" : ""}>
                {formatDate(d.dueDate)}
                {OPEN_DIRECTIVE_STATUSES.includes(status) && daysLeft != null && (
                  <> · {overdue ? `overdue by ${-daysLeft} day${daysLeft === -1 ? "" : "s"}` : daysLeft === 0 ? "due today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</>
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
              {transitions.some((t) => t.to === "COMPLIED") ? "Respond" : "Review"}
            </div>
            <StatusChange kind="directive" id={d.id} stateSlug={state.code.toLowerCase()} transitions={transitions} />
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 font-medium">
          History
        </h2>
        <Timeline entries={d.updates} labels={DIRECTIVE_STATUS_LABELS} createdVerb="Directive issued" />
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
