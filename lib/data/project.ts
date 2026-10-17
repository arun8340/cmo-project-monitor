import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope } from "@/lib/auth/scope";
import { canEditProject, canUpdateProgress, canUploadImagery } from "@/lib/auth/project-permissions";
import type { StateCode, StateConfig } from "@/config/states";
import { districtSlug } from "@/lib/district-slug";
import type { ProjectStatus } from "@/lib/constants";
import { behindBy, plannedPercent } from "@/lib/progress";
import { getSummarizer } from "@/lib/audit";

export type ActivityItem = { id: string; action: string; at: Date; userName: string | null; summary: string };

/** Everything the project page needs. Call only after assertCanAccessProject(). */
export async function getProjectDetail(user: CurrentUser, projectId: string, stateCode: StateCode) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      district: true,
      department: true,
      createdBy: { select: { name: true } },
      progressUpdates: { orderBy: { date: "asc" }, include: { updatedBy: { select: { name: true } } } },
      imagery: { orderBy: { captureDate: "desc" }, take: 4 },
      issues: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
      _count: { select: { imagery: true } },
    },
  });
  if (!project) return null;

  const [directives, audit, summarize] = await Promise.all([
    db.directive.findMany({
      where: { AND: [directiveScope(user, stateCode), { projectId }] },
      include: { fromUser: { select: { name: true } }, owner: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    db.auditLog.findMany({
      where: { entityType: "Project", entityId: projectId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getSummarizer(),
  ]);

  const status = project.status as ProjectStatus;
  const planned = plannedPercent(project.startDate, project.plannedEndDate);
  const lastUpdate = project.progressUpdates.at(-1) ?? null;

  return {
    project,
    status,
    planned,
    behind: behindBy(status, project.progressPercent, planned),
    lastUpdate,
    directives,
    activity: audit.map<ActivityItem>((a) => ({
      id: a.id,
      action: a.action,
      at: a.createdAt,
      userName: a.user?.name ?? null,
      summary: summarize(a.action, a.details),
    })),
    can: { edit: canEditProject(user), updateProgress: canUpdateProgress(user), uploadImagery: canUploadImagery(user) },
  };
}

/** Districts and departments the user may choose in the add / edit form. */
export async function getProjectFormOptions(user: CurrentUser, state: StateConfig) {
  const [districts, departments] = await Promise.all([
    db.district.findMany({ where: districtScope(user, state.code), orderBy: { name: "asc" } }),
    db.department.findMany({ where: departmentScope(user, state.code) }),
  ]);
  const ORDER = ["PWD", "METRO", "DRAINAGE", "URBAN", "RNB", "RURAL", "MGNREGA"];
  return {
    districts: districts.map((d) => ({
      slug: districtSlug(d.geoCode),
      name: d.name,
      nameLocal: d.nameLocal,
      center: [d.latitude ?? state.mapCenter[0], d.longitude ?? state.mapCenter[1]] as [number, number],
    })),
    departments: departments
      .sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code))
      .map((d) => ({ code: d.code, name: d.name, nameLocal: d.nameLocal })),
  };
}
