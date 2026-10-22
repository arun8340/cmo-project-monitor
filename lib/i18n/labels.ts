/**
 * Translated labels for the fixed value lists in lib/constants.ts (statuses,
 * priorities, sources, roles, …). Server components: `await getLabels()`
 * (lib/i18n/server.ts); client components: `useLabels()` (lib/i18n/client.ts).
 */
import {
  DIRECTIVE_STATUSES,
  IMAGERY_SOURCES,
  ISSUE_PRIORITIES,
  MEETING_STATUSES,
  ISSUE_STATUSES,
  PROJECT_STATUSES,
  ROLE_KEYS,
  VERIFICATION_OUTCOMES,
  type DirectiveStatus,
  type ImagerySource,
  type IssuePriority,
  type IssueStatus,
  type MeetingStatus,
  type ProjectStatus,
  type RoleKey,
  type VerificationOutcome,
} from "@/lib/constants";

export type Labels = {
  projectStatus: Record<ProjectStatus, string>;
  issueStatus: Record<IssueStatus, string>;
  priority: Record<IssuePriority, string>;
  directiveStatus: Record<DirectiveStatus, string>;
  source: Record<ImagerySource, string>;
  outcome: Record<VerificationOutcome, string>;
  role: Record<RoleKey, string>;
  meetingStatus: Record<MeetingStatus, string>;
};

/** `t` is a translator for the "enums" namespace. */
export function buildLabels(t: (key: string) => string): Labels {
  const map = <K extends string>(group: string, keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, t(`${group}.${k}`)])) as Record<K, string>;
  return {
    projectStatus: map("projectStatus", PROJECT_STATUSES),
    issueStatus: map("issueStatus", ISSUE_STATUSES),
    priority: map("priority", ISSUE_PRIORITIES),
    directiveStatus: map("directiveStatus", DIRECTIVE_STATUSES),
    source: map("source", IMAGERY_SOURCES),
    outcome: map("outcome", VERIFICATION_OUTCOMES),
    role: map("role", ROLE_KEYS),
    meetingStatus: map("meetingStatus", MEETING_STATUSES),
  };
}
