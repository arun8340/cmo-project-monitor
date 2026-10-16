import type { PortalId } from "./portals";

/**
 * Demo accounts shown on the login page (POC only). Must match prisma/seed.ts.
 * Each portal only lists its own accounts.
 * Hide the list by setting NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="false".
 */
export const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

export const DEMO_PASSWORD = "Demo@123";

export type DemoAccount = { email: string; role: string; scope: string; portal: PortalId };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@demo.gov.in", role: "Admin", scope: "Both states", portal: "ADMIN" },
  { email: "cmo.rj@demo.gov.in", role: "CMO", scope: "Whole state", portal: "RJ" },
  { email: "pwd.rj@demo.gov.in", role: "Dept. Head", scope: "PWD", portal: "RJ" },
  { email: "collector.jaipur@demo.gov.in", role: "Collector", scope: "Jaipur", portal: "RJ" },
  { email: "field.jaipur@demo.gov.in", role: "Field Officer", scope: "Jaipur", portal: "RJ" },
  { email: "cmo.mh@demo.gov.in", role: "CMO", scope: "Whole state", portal: "MH" },
  { email: "pwd.mh@demo.gov.in", role: "Dept. Head", scope: "PWD", portal: "MH" },
  { email: "collector.pune@demo.gov.in", role: "Collector", scope: "Pune", portal: "MH" },
  { email: "field.pune@demo.gov.in", role: "Field Officer", scope: "Pune", portal: "MH" },
];
