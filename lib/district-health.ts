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

/**
 * Health colours (always shown with a text label — "map.health.*" messages —
 * never colour alone): `color` for dots and swatches, `fill` / `stroke` for the
 * pastel map, `pill` for badges.
 */
export const HEALTH_STYLE: Record<Health, { color: string; fill: string; stroke: string; pill: string }> = {
  good: { color: "#2f7a4b", fill: "#cfe8d7", stroke: "#8cc3a0", pill: "bg-ok-soft text-ok" },
  warning: { color: "#e9a23b", fill: "#f7e2bc", stroke: "#e2bd7c", pill: "bg-warn-soft text-warn" },
  critical: { color: "#a93232", fill: "#f4cfcf", stroke: "#dea0a0", pill: "bg-bad-soft text-bad" },
  none: { color: "#cfc9bb", fill: "#ebe7dd", stroke: "#d6d0c2", pill: "bg-muted text-muted-foreground" },
};

/** Colours for project-status breakdowns (bars, dots). */
export const PROJECT_STATUS_COLOR = {
  completed: "#2f7a4b",
  ongoing: "#2c4f7c",
  delayed: "#e9a23b",
  stalled: "#a93232",
  notStarted: "#d6d0c2",
} as const;

/** Same colours keyed by the stored project status. */
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  COMPLETED: PROJECT_STATUS_COLOR.completed,
  ONGOING: PROJECT_STATUS_COLOR.ongoing,
  DELAYED: PROJECT_STATUS_COLOR.delayed,
  STALLED: PROJECT_STATUS_COLOR.stalled,
  NOT_STARTED: PROJECT_STATUS_COLOR.notStarted,
};
