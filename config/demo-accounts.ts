import type { PortalId } from "./portals";
import type { RoleKey } from "@/lib/constants";

/**
 * Demo accounts shown on the login page (POC only). Must match prisma/seed.ts.
 * Each portal only lists its own accounts.
 * Hide the list by setting NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="false".
 */
export const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

export const DEMO_PASSWORD = "Demo@123";

/** `scope`: a place or department name, or "STATE" (whole state) / "ALL" (every state). */
export type DemoAccount = { email: string; role: RoleKey; scope: string; portal: PortalId };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@demo.gov.in", role: "ADMIN", scope: "ALL", portal: "ADMIN" },
  { email: "cmo.rj@demo.gov.in", role: "CMO", scope: "STATE", portal: "RJ" },
  { email: "rnb.rj@demo.gov.in", role: "DEPARTMENT_HEAD", scope: "Roads & Buildings", portal: "RJ" },
  { email: "collector.jaipur@demo.gov.in", role: "DISTRICT_COLLECTOR", scope: "Jaipur", portal: "RJ" },
  { email: "field.jaipur@demo.gov.in", role: "FIELD_OFFICER", scope: "Jaipur", portal: "RJ" },
  { email: "cmo.mh@demo.gov.in", role: "CMO", scope: "STATE", portal: "MH" },
  { email: "pwd.mh@demo.gov.in", role: "DEPARTMENT_HEAD", scope: "PWD", portal: "MH" },
  { email: "collector.mumbai-suburban@demo.gov.in", role: "DISTRICT_COLLECTOR", scope: "Mumbai Suburban", portal: "MH" },
  { email: "field.mumbai-suburban@demo.gov.in", role: "FIELD_OFFICER", scope: "Mumbai Suburban", portal: "MH" },
];
