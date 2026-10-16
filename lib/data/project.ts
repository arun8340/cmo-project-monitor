import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { departmentScope, directiveScope, districtScope } from "@/lib/auth/scope";
import { canEditProject, canUpdateProgress, canUploadImagery } from "@/lib/auth/project-permissions";
import type { StateCode, StateConfig } from "@/config/states";
import { districtSlug } from "@/lib/district-slug";
import type { ProjectStatus } from "@/lib/constants";
import { behindBy, plannedPercent } from "@/lib/progress";

export type ActivityItem = { id: string; action: string; at: Date; userName: string | null; summary: string };

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  nameLocal: "local name",
  description: "description",
  latitude: "location",
  longitude: "location",
  budgetLakhs: "budget",
  startDate: "start date",
  plannedEndDate: "planned end date",
  district: "district",
  department: "department",
};

function summarize(action: string, details: string | null): string {
  let d: Record<string, unknown> = {};
  try {
    d = details ? JSON.parse(details) : {};
  } catch {}
  switch (action) {
    case "project.create":
      return "Project created";
    case "project.update": {
      const fields = [...new Set(Object.keys((d.changes as object) ?? {}).map((k) => FIELD_LABELS[k] ?? k))];
      return fields.length ? `Edited ${fields.join(", ")}` : "Edited project";
    }
    case "progress.update": {
      const from = d.from as { progress?: number } | undefined;
      const to = d.to as { progress?: number } | undefined;
      return `Progress ${from?.progress ?? "?"}% → ${to?.progress ?? "?"}%`;
    }
    case "verification.record":
      return `Verification recorded: ${{ PROGRESS_VISIBLE: "progress visible", NO_VISIBLE_CHANGE: "no visible change", DISCREPANCY: "discrepancy" }[d.outcome as string] ?? d.outcome}`;
    case "imagery.upload":
      return `Uploaded ${d.count ?? ""} image${d.count === 1 ? "" : "s"}`;
    default:
      return action;
  }
}

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

  const [directives, audit] = await Promise.all([
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
      center: [d.latitude ?? state.mapCenter[0], d.longitude ?? state.mapCenter[1]] as [number, number],
    })),
    departments: departments
      .sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code))
      .map((d) => ({ code: d.code, name: d.name, nameLocal: d.nameLocal })),
  };
}
