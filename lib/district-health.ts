import type { ProjectStatus } from "@/lib/constants";

/**
 * Red / amber / green health of a district (or any group of projects), shared
 * by the server (classification) and the map/legend (colours and labels).
 */

export type StatusCounts = {
  total: number;
  notStarted: number;
  ongoing: number;
  completed: number;
  delayed: number;
  stalled: number;
};

export const EMPTY_COUNTS: StatusCounts = { total: 0, notStarted: 0, ongoing: 0, completed: 0, delayed: 0, stalled: 0 };

export type Health = "good" | "warning" | "critical" | "none";

/**
 * - critical: any stalled project, or at least two (and over a third) of active projects behind
 * - warning:  at least one delayed project
 * - good:     projects exist and none are delayed or stalled
 * - none:     no projects
 */
export function classifyHealth(c: StatusCounts): Health {
  if (c.total === 0) return "none";
  const active = c.total - c.completed;
  const behind = c.delayed + c.stalled;
  if (c.stalled > 0 || (behind >= 2 && behind / active > 1 / 3)) return "critical";
  if (c.delayed > 0) return "warning";
  return "good";
}

/** Status colours (fixed; always shown with a text label, never colour alone). */
export const HEALTH_STYLE: Record<Health, { color: string; label: string; description: string }> = {
  good: { color: "#0ca30c", label: "On track", description: "No delayed or stalled projects" },
  warning: { color: "#fab219", label: "Some delays", description: "At least one project delayed" },
  critical: { color: "#d03b3b", label: "Needs attention", description: "Stalled work, or several projects behind schedule" },
  none: { color: "#cbd5e1", label: "No projects", description: "No projects in view" },
};

/** Colours for project-status breakdowns (status colours + neutrals). */
export const PROJECT_STATUS_COLOR = {
  completed: "#0ca30c",
  ongoing: "#475569",
  delayed: "#fab219",
  stalled: "#d03b3b",
  notStarted: "#cbd5e1",
} as const;

/** Same colours keyed by the stored project status. */
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  COMPLETED: PROJECT_STATUS_COLOR.completed,
  ONGOING: PROJECT_STATUS_COLOR.ongoing,
  DELAYED: PROJECT_STATUS_COLOR.delayed,
  STALLED: PROJECT_STATUS_COLOR.stalled,
  NOT_STARTED: PROJECT_STATUS_COLOR.notStarted,
};
