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

export const metadata: Metadata = { title: "Upload imagery" };

type Params = PageProps<"/[state]/project/[id]/imagery/upload">;

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

  return (
    <div className="grid gap-5">
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: project.district.name, href: `${basePath}/district/${districtSlug(project.district.geoCode)}` },
          { label: project.name, href: projectPath },
          { label: "Upload imagery" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload imagery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.name}. Uploaded imagery is kept as a permanent record and can&apos;t be edited or deleted.
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
