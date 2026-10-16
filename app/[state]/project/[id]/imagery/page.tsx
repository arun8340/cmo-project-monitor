import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ColumnsIcon, ImagesIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { AvailabilityTimeline } from "@/components/imagery/availability-timeline";
import { Gallery, type GalleryItem } from "@/components/imagery/gallery";
import { SOURCE_META } from "@/components/imagery/source-meta";
import { UploadedToast } from "@/components/imagery/uploaded-toast";
import { db } from "@/lib/db";
import { assertCanAccessProject, requireStateAccess } from "@/lib/auth/dal";
import { canUploadImagery } from "@/lib/auth/project-permissions";
import { districtSlug } from "@/lib/district-slug";
import { formatDate } from "@/lib/format";
import { toDateInput } from "@/lib/dates";
import { distanceKm } from "@/lib/geo";
import { IMAGERY_SOURCES, type ImagerySource } from "@/lib/constants";

export const metadata: Metadata = { title: "Imagery" };

type Params = PageProps<"/[state]/project/[id]/imagery">;

export default function ImageryPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <Suspense fallback={<Skeleton className="h-[640px] w-full" />}>
        <Imagery params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Imagery({ params, searchParams }: { params: Params["params"]; searchParams: Params["searchParams"] }) {
  const [{ state: stateParam, id }, sp] = await Promise.all([params, searchParams]);
  const { user, state, basePath } = await requireStateAccess(stateParam);
  const access = await assertCanAccessProject(user, id);
  if (access.stateCode !== state.code) notFound();

  const project = await db.project.findUnique({
    where: { id },
    include: {
      district: true,
      department: true,
      imagery: { orderBy: [{ captureDate: "desc" }, { createdAt: "desc" }], include: { uploadedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const filter = IMAGERY_SOURCES.find((s) => s === String(sp.source ?? "").toUpperCase()) ?? null;
  const all = project.imagery;
  const shown = filter ? all.filter((c) => c.source === filter) : all;
  const now = new Date();
  const projectPath = `${basePath}/project/${id}`;
  const galleryPath = `${projectPath}/imagery`;
  const districtPath = `${basePath}/district/${districtSlug(project.district.geoCode)}`;
  const uploaded = Number(sp.uploaded);

  const items: GalleryItem[] = shown.map((c) => {
    const gps: [number, number] | null = c.exifLatitude != null && c.exifLongitude != null ? [c.exifLatitude, c.exifLongitude] : null;
    return {
      id: c.id,
      day: toDateInput(c.captureDate),
      dayLabel: formatDate(c.captureDate),
      yearLabel: toDateInput(c.captureDate).slice(0, 4),
      source: c.source as ImagerySource,
      notes: c.notes,
      uploader: c.uploadedBy?.name ?? null,
      uploadedOn: formatDate(c.createdAt),
      width: c.width,
      height: c.height,
      sizeBytes: c.sizeBytes,
      gps,
      distanceKm: gps ? distanceKm(gps, [project.latitude, project.longitude]) : null,
      takenAt: c.exifTakenAt
        ? c.exifTakenAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
        : null,
    };
  });

  const counts = Object.fromEntries(IMAGERY_SOURCES.map((s) => [s, all.filter((c) => c.source === s).length])) as Record<ImagerySource, number>;
  const dates = new Set(all.map((c) => toDateInput(c.captureDate))).size;

  return (
    <div className="grid gap-5">
      {uploaded > 0 && <UploadedToast count={uploaded} />}
      <Breadcrumbs
        items={[
          { label: state.name, href: basePath || "/" },
          { label: project.district.name, href: districtPath },
          { label: project.name, href: projectPath },
          { label: "Imagery" },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ImagesIcon className="size-6 text-muted-foreground" />
            Imagery
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · {all.length} image{all.length === 1 ? "" : "s"} on {dates} date{dates === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {all.length >= 2 && (
            <Button variant={canUploadImagery(user) ? "outline" : "default"} nativeButton={false} render={<Link href={`${projectPath}/compare`} />}>
              <ColumnsIcon />
              Compare imagery
            </Button>
          )}
          {canUploadImagery(user) && (
            <Button nativeButton={false} render={<Link href={`${galleryPath}/upload`} />}>
              <UploadIcon />
              Upload imagery
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="availability-heading">
        <h2 id="availability-heading" className="mb-1 font-medium">
          Availability by date
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">Each mark is a day with imagery. Gaps show periods with no coverage.</p>
        {all.length ? (
          <AvailabilityTimeline captures={all} start={project.startDate} now={now} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No imagery yet.</p>
        )}
      </section>

      <nav aria-label="Filter by source" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip href={galleryPath} active={!filter} label="All" count={all.length} />
        {IMAGERY_SOURCES.map((s) => (
          <Chip key={s} href={`${galleryPath}?source=${s.toLowerCase()}`} active={filter === s} label={SOURCE_META[s].label} count={counts[s]} source={s} />
        ))}
      </nav>

      {items.length ? (
        <Gallery items={items} compareHref={all.length >= 2 ? `${projectPath}/compare` : null} latestId={all[0]?.id ?? null} />
      ) : (
        <p className="rounded-xl border border-dashed bg-card py-14 text-center text-sm text-muted-foreground">
          {filter ? `No ${SOURCE_META[filter].label.toLowerCase()} imagery yet.` : "No imagery uploaded for this project yet."}
        </p>
      )}
    </div>
  );
}

function Chip({ href, active, label, count, source }: { href: string; active: boolean; label: string; count: number; source?: ImagerySource }) {
  const Icon = source ? SOURCE_META[source].icon : null;
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted"
      } ${count === 0 && !active ? "opacity-50" : ""}`}
    >
      {Icon && <Icon className="size-3.5" style={{ color: active ? undefined : SOURCE_META[source!].color }} />}
      {label}
      <span className={active ? "text-background/70" : "text-muted-foreground"}>{count}</span>
    </Link>
  );
}
