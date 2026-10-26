import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  CalendarClockIcon,
  MapPinIcon,
  RadioIcon,
  UserRoundIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { Panel } from "@/components/app-shell/page-parts";
import { OnceToast } from "@/components/workflow/once-toast";
import { PriorityBadge } from "@/components/workflow/badges";
import { StatusChange } from "@/components/workflow/status-change";
import { Timeline } from "@/components/workflow/timeline";
import {
  OverdueBadge,
  RequestStatusBadge,
  RequestType,
} from "@/components/requests/request-bits";
import { requireStateAccess } from "@/lib/auth/dal";
import { getRequest } from "@/lib/data/requests";
import { requestTransitions } from "@/lib/workflow";
import { formatDate } from "@/lib/format";
import { imageryUrl } from "@/lib/imagery/url";
import { getLocale, getTranslations } from "next-intl/server";
import { getLabels } from "@/lib/i18n/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("requests"))("detailTitle") };
}

type Params = PageProps<"/[locale]/[state]/requests/[id]">;

export default function RequestPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Request params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Request({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: Params["searchParams"];
}) {
  const [{ state: stateParam, id }, sp] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const r = await getRequest(user, state, id);
  if (!r) notFound();
  const [t, tw, labels, locale] = await Promise.all([
    getTranslations("requests"),
    getTranslations("workflow"),
    getLabels(),
    getLocale(),
  ]);
  const projectPath = `${basePath}/project/${r.project.id}`;
  const projectName = localName(locale, r.project.name, r.project.nameLocal);
  const latest = r.project.imagery[0];
  const transitions = requestTransitions(user, r.status, r.requestedById);

  return (
    <div className="grid gap-5">
      {sp.created === "1" && <OnceToast message={t("created")} />}
      <Breadcrumbs
        items={[
          {
            label: localName(locale, state.name, state.nameLocal),
            href: basePath || "/",
          },
          { label: t("title"), href: `${basePath}/requests` },
          { label: projectName },
        ]}
      />

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <RequestType type={r.type} />
          <RequestStatusBadge status={r.status} />
          <PriorityBadge priority={r.priority} />
          {r.overdue && <OverdueBadge />}
          {r.requestedBy.role.key === "CMO" && (
            <span className="text-xs font-semibold text-bad">
              {t("cmoRequest")}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-[24px] leading-tight font-bold tracking-tight text-navy">
          {t("heading", { type: labels.source[r.type], project: projectName })}
        </h1>
        <p className="mt-3 text-[15px] whitespace-pre-line">{r.purpose}</p>
        <dl className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
          <Fact
            icon={CalendarClockIcon}
            label={t("fNeededBy")}
            value={formatDate(r.neededBy, locale)}
          />
          <Fact
            icon={UserRoundIcon}
            label={t("raisedBy")}
            value={`${r.requestedBy.name} · ${formatDate(r.createdAt, locale)}`}
          />
          <Fact
            icon={MapPinIcon}
            label={t("site")}
            value={`${localName(locale, r.project.district.name, r.project.district.nameLocal)} · ${r.project.latitude.toFixed(4)}, ${r.project.longitude.toFixed(4)}`}
          />
        </dl>
        {transitions.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <StatusChange
              kind="request"
              id={r.id}
              stateSlug={state.code.toLowerCase()}
              transitions={transitions}
            />
          </div>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={t("history")}>
          <Timeline
            entries={r.updates}
            labels={labels.requestStatus}
            createdVerb={t("raised")}
          />
        </Panel>
        <Panel title={t("project")}>
          <Link
            href={projectPath}
            className="font-semibold text-link hover:underline"
          >
            {projectName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {localName(
              locale,
              r.project.department.name,
              r.project.department.nameLocal,
            )}{" "}
            ·{" "}
            {localName(
              locale,
              r.project.district.name,
              r.project.district.nameLocal,
            )}
          </p>
          {latest ? (
            <Link
              href={`${projectPath}/live`}
              className="group relative mt-3 block overflow-hidden rounded-lg"
            >
              {/* Access-checked API image (see app/api/imagery). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageryUrl(latest.id, "thumb")}
                alt=""
                className="aspect-[16/10] w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-navy/85 px-2 py-0.5 text-xs font-semibold text-white">
                {t("currentLatest", {
                  date: formatDate(latest.captureDate, locale),
                })}
              </span>
              <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-amber px-2 py-0.5 text-xs font-bold text-navy">
                <RadioIcon className="size-3.5" />
                {tw("liveTracking")}
              </span>
            </Link>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              {t("noImageryYet")}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPinIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold text-navy">{value}</dd>
      </div>
    </div>
  );
}
