import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { LiveView } from "@/components/imagery/live-view";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canUploadImagery } from "@/lib/auth/project-permissions";
import { getCompareData } from "@/lib/data/compare";
import { relativeDays } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getLabels } from "@/lib/i18n/server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("tracking"))("title") };
}

type Params = PageProps<"/[locale]/[state]/project/[id]/live">;

/** Live tracking: the latest image of the site, all capture dates, and a two-date compare (?image=id to start elsewhere). */
export default function LivePage({ params, searchParams }: Params) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-[#0d1726] text-white/70">
          <LoaderCircleIcon className="size-6 animate-spin" />
        </div>
      }
    >
      <Live params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Live({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, id }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();

  const [data, labels, locale, t] = await Promise.all([getCompareData(user, id, state.code), getLabels(), getLocale() as Promise<Locale>, getTranslations("tracking")]);
  if (!data) notFound();

  const projectPath = `${basePath}/project/${id}`;
  const uploadHref = canUploadImagery(user) ? `${projectPath}/imagery/upload` : null;
  if (data.images.length === 0) {
    return (
      <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-3 bg-[#0d1726] px-4 text-center text-white">
        <p className="font-medium">{t("noImagery")}</p>
        <div className="flex gap-2">
          {uploadHref && (
            <a href={uploadHref} className="rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-navy">
              {t("addImages")}
            </a>
          )}
          <a href={projectPath} className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-900">
            {t("backToProject")}
          </a>
        </div>
      </div>
    );
  }

  const now = new Date();
  const images = data.images.map((i) => ({
    id: i.id,
    dayLabel: i.dayLabel,
    sourceLabel: labels.source[i.source],
    ago: relativeDays(new Date(`${i.day}T12:00:00+05:30`), now, locale),
    reportedProgress: i.reportedProgress,
  }));
  const requested = typeof sp.image === "string" ? sp.image : "";

  return (
    <LiveView
      project={{ name: data.project.name, districtName: data.project.districtName }}
      images={images}
      initialId={images.some((i) => i.id === requested) ? requested : images.at(-1)!.id}
      closeHref={projectPath}
      compareHref={`${projectPath}/compare?from=project`}
      uploadHref={uploadHref}
    />
  );
}
