import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { UploadForm } from "@/components/imagery/upload-form";
import { db } from "@/lib/db";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canProcessRequests, canUploadImagery } from "@/lib/auth/project-permissions";
import type { ImagerySource } from "@/lib/constants";
import { districtSlug } from "@/lib/district-slug";
import { todayIST } from "@/lib/dates";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("upload"))("title") };
}

type Params = PageProps<"/[locale]/[state]/project/[id]/imagery/upload">;

export default function UploadPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Upload params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Upload({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, id }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code || !canUploadImagery(user)) notFound();

  const project = await db.project.findUnique({ where: { id }, include: { district: true } });
  if (!project) notFound();

  const projectPath = `${basePath}/project/${id}`;
  // Delivering a DoIT order: ?request=<id> (an ordered request for this project).
  const request =
    typeof sp.request === "string" && canProcessRequests(user)
      ? await db.imageryRequest.findFirst({
          where: { id: sp.request, projectId: id, status: "ORDERED" },
          include: { vendor: { select: { name: true } } },
        })
      : null;
  const [t, locale] = await Promise.all([getTranslations("upload"), getLocale()]);
  const projectName = localName(locale, project.name, project.nameLocal);

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: localName(locale, state.name, state.nameLocal), href: basePath || "/" },
          { label: localName(locale, project.district.name, project.district.nameLocal), href: `${basePath}/district/${districtSlug(project.district.geoCode)}` },
          { label: projectName, href: projectPath },
          { label: t("title") },
        ]}
      />
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-navy">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projectName}. {t("permanent")}
        </p>
        {request && (
          <p className="mt-3 rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm text-info">
            {t("deliveringOrder", { vendor: request.vendor?.name ?? "—", ref: request.orderRef ?? "—" })}
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <UploadForm
          projectId={project.id}
          stateSlug={state.code.toLowerCase()}
          site={[project.latitude, project.longitude]}
          today={todayIST()}
          defaultSource={request ? (request.type as ImagerySource) : user.roleKey === "FIELD_OFFICER" ? "FIELD_PHOTO" : "SATELLITE"}
          cancelHref={request ? `${basePath}/requests/${request.id}` : `${projectPath}/imagery`}
          requestId={request?.id}
          defaultNotes={request ? t("deliveredNote", { vendor: request.vendor?.name ?? "—", ref: request.orderRef ?? "—" }) : undefined}
        />
      </div>
    </div>
  );
}
