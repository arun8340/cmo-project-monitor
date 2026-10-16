import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { projectScope } from "@/lib/auth/scope";
import type { StateCode } from "@/config/states";
import { formatDate } from "@/lib/format";
import { toDateInput } from "@/lib/dates";
import { districtSlug } from "@/lib/district-slug";
import { VERIFICATION_OUTCOMES, type ImagerySource, type VerificationOutcome } from "@/lib/constants";

export type CompareImage = {
  id: string;
  day: string;
  dayLabel: string;
  source: ImagerySource;
  width: number | null;
  height: number | null;
  /** Progress reported (latest progress update) as of the capture date. */
  reportedProgress: number;
};

export type VerificationRow = {
  id: string;
  outcome: VerificationOutcome;
  notes: string | null;
  imageIds: string[];
  fromLabel: string;
  toLabel: string;
  byName: string;
  at: Date;
};

export const MAX_COMPARE = 4;

/** Everything the comparison screen needs for one project. Call after assertCanAccessProject(). */
export async function getCompareData(user: CurrentUser, projectId: string, stateCode: StateCode) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      district: true,
      imagery: { orderBy: [{ captureDate: "asc" }, { createdAt: "asc" }] },
      progressUpdates: { orderBy: { date: "asc" }, select: { date: true, progressPercent: true } },
    },
  });
  if (!project) return null;

  const progressAt = (d: Date) => {
    let p = 0;
    for (const u of project.progressUpdates) {
      if (u.date <= d) p = u.progressPercent;
      else break;
    }
    return p;
  };

  const images: CompareImage[] = project.imagery.map((c) => ({
    id: c.id,
    day: toDateInput(c.captureDate),
    dayLabel: formatDate(c.captureDate),
    source: c.source as ImagerySource,
    width: c.width,
    height: c.height,
    reportedProgress: progressAt(c.captureDate),
  }));

  // Other projects in scope with at least two images, for the project picker.
  const others = await db.project.findMany({
    where: { AND: [projectScope(user, stateCode), { imagery: { some: {} } }] },
    select: { id: true, name: true, district: { select: { name: true, geoCode: true } }, _count: { select: { imagery: true } } },
    orderBy: [{ district: { name: "asc" } }, { name: "asc" }],
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      districtName: project.district.name,
      districtSlug: districtSlug(project.district.geoCode),
      progressPercent: project.progressPercent,
    },
    images,
    projects: others
      .filter((p) => p._count.imagery >= 2)
      .map((p) => ({ id: p.id, name: p.name, district: p.district.name })),
  };
}

export async function getVerifications(projectId: string): Promise<VerificationRow[]> {
  const rows = await db.verification.findMany({
    where: { projectId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((v) => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(v.imageIds);
    } catch {}
    return {
      id: v.id,
      outcome: (VERIFICATION_OUTCOMES as readonly string[]).includes(v.outcome) ? (v.outcome as VerificationOutcome) : "NO_VISIBLE_CHANGE",
      notes: v.notes,
      imageIds: ids,
      fromLabel: formatDate(v.fromDate),
      toLabel: formatDate(v.toDate),
      byName: v.createdBy.name,
      at: v.createdAt,
    };
  });
}
