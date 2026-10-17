import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { UploadForm } from "@/components/imagery/upload-form";
import { db } from "@/lib/db";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canUploadImagery } from "@/lib/auth/project-permissions";
import { districtSlug } from "@/lib/district-slug";
import { todayIST } from "@/lib/dates";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/i18n/names";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("upload"))("title") };
}

type Params = PageProps<"/[locale]/[state]/project/[id]/imagery/upload">;

export default function UploadPage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[560px] w-full" />}>
        <Upload params={params} />
      </Suspense>
    </main>
  );
}

async function Upload({ params }: { params: Params["params"] }) {
  const { state: stateParam, id } = await params;
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code || !canUploadImagery(user)) notFound();

  const project = await db.project.findUnique({ where: { id }, include: { district: true } });
  if (!project) notFound();

  const projectPath = `${basePath}/project/${id}`;
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {projectName}. {t("permanent")}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <UploadForm
          projectId={project.id}
          stateSlug={state.code.toLowerCase()}
          site={[project.latitude, project.longitude]}
          today={todayIST()}
          defaultSource={user.roleKey === "FIELD_OFFICER" ? "FIELD_PHOTO" : "SATELLITE"}
          cancelHref={`${projectPath}/imagery`}
        />
      </div>
    </div>
  );
}
