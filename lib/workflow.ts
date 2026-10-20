/**
 * Allowed status changes for issues and directives, and when a note is
 * required. Used by both the UI (which buttons to show) and the server actions
 * (which changes to accept).
 */
import type { CurrentUser } from "@/lib/auth/dal";
import type { DirectiveStatus, IssueStatus } from "@/lib/constants";

/** `label` is a key in the "workflow" messages. */
type Transition<S> = { to: S; label: string; noteRequired: boolean };

// ---- Issues: anyone with issues.update may move an issue to any other status.
export function issueTransitions(from: IssueStatus): Transition<IssueStatus>[] {
  const reopening = from === "RESOLVED" || from === "ARCHIVED";
  const all: Transition<IssueStatus>[] = [
    { to: "IN_PROGRESS", label: reopening ? "reopenInProgress" : "markInProgress", noteRequired: reopening },
    { to: "RESOLVED", label: "markResolved", noteRequired: true },
    { to: "PENDING", label: reopening ? "reopenPending" : "backToPending", noteRequired: reopening },
    { to: "ARCHIVED", label: "archive", noteRequired: false },
  ];
  return all.filter((t) => t.to !== from);
}

// ---- Directives
const has = (user: CurrentUser, p: string) => (user.permissions as string[]).includes(p);

/**
 * - Responders (Collectors, Department Heads, the directive's owner): mark an
 *   open directive in progress or complied (compliance note required).
 * - Issuers (CMO, Admin): close a complied directive, or reopen / withdraw one
 *   (note required).
 * Admin can do both.
 */
export function directiveTransitions(user: CurrentUser, from: DirectiveStatus, ownerId: string | null): Transition<DirectiveStatus>[] {
  const issuer = has(user, "directives.issue");
  const responder = user.roleKey === "ADMIN" || (has(user, "directives.update") && !issuer) || ownerId === user.id;
  const out: Transition<DirectiveStatus>[] = [];

  if (responder && (from === "OPEN" || from === "IN_PROGRESS")) {
    if (from === "OPEN") out.push({ to: "IN_PROGRESS", label: "markInProgress", noteRequired: false });
    out.push({ to: "COMPLIED", label: "markComplied", noteRequired: true });
  }
  if (issuer) {
    if (from === "COMPLIED") {
      out.push({ to: "CLOSED", label: "acceptClose", noteRequired: false });
      out.push({ to: "OPEN", label: "reopenUnsatisfactory", noteRequired: true });
    } else if (from === "CLOSED") {
      out.push({ to: "OPEN", label: "reopen", noteRequired: true });
    } else {
      out.push({ to: "CLOSED", label: "withdraw", noteRequired: true });
    }
  }
  return out;
}

export const OPEN_ISSUE_STATUSES: IssueStatus[] = ["PENDING", "IN_PROGRESS"];
export const OPEN_DIRECTIVE_STATUSES: DirectiveStatus[] = ["OPEN", "IN_PROGRESS"];
