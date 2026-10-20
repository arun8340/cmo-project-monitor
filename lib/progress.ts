import type { ProjectStatus } from "@/lib/constants";

/** Points by which actual progress may trail the plan before a project is flagged. */
export const BEHIND_THRESHOLD = 10;

/**
 * Planned progress (0–100) at `now`, assuming linear progress between the
 * start date and the planned end date.
 */
export function plannedPercent(start: Date | null, plannedEnd: Date | null, now = new Date()) {
  if (!start || !plannedEnd) return null;
  const total = plannedEnd.getTime() - start.getTime();
  if (total <= 0) return now >= plannedEnd ? 100 : 0;
  return Math.round(Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / total) * 100)));
}

/** How many points actual progress is behind plan (0 if on or ahead of plan, or done). */
export function behindBy(status: ProjectStatus, actual: number, planned: number | null) {
  if (planned == null || status === "COMPLETED" || status === "NOT_STARTED") return 0;
  return Math.max(0, planned - actual);
}
