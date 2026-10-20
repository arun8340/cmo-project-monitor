import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoaderCircleIcon } from "lucide-react";
import { CompareView } from "@/components/compare/compare-view";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canRecordVerification } from "@/lib/auth/project-permissions";
import { getCompareData, getVerifications, MAX_COMPARE } from "@/lib/data/compare";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("compare"))("title") };
}

type Params = PageProps<"/[locale]/[state]/project/[id]/compare">;

/** Full-screen comparison of 2–4 dated images (?images=id1,id2,…). */
export default function ComparePage({ params, searchParams }: Params) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[45] flex items-center justify-center bg-navy text-white/70">
          <LoaderCircleIcon className="size-6 animate-spin" />
        </div>
      }
    >
      <Compare params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Compare({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, id }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();

  const [data, verifications] = await Promise.all([getCompareData(user, id, state.code), getVerifications(id)]);
  if (!data) notFound();

  const galleryHref = `${basePath}/project/${id}/imagery`;
  if (data.images.length < 2) {
    const t = await getTranslations("compare");
    return (
      <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-3 bg-navy px-4 text-center text-white">
        <p className="font-medium">{t("needTwo")}</p>
        <a href={galleryHref} className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-900">
          {t("backToImagery")}
        </a>
      </div>
    );
  }

  // Requested images (only those belonging to this project), else earliest vs latest.
  const known = new Set(data.images.map((i) => i.id));
  const requested = [...new Set(String(sp.images ?? "").split(","))].filter((x) => known.has(x)).slice(0, MAX_COMPARE);
  const selection = requested.length >= 2 ? requested : [data.images[0].id, data.images.at(-1)!.id];

  return (
    <CompareView
      project={data.project}
      stateSlug={state.code.toLowerCase()}
      basePath={basePath}
      images={data.images}
      initialSelection={selection}
      projects={data.projects}
      previousVerifications={verifications}
      canVerify={canRecordVerification(user)}
      closeHref={typeof sp.from === "string" && sp.from === "project" ? `${basePath}/project/${id}` : galleryHref}
    />
  );
}
