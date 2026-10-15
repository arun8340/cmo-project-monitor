/**
 * Demo accounts shown on the login page (POC only). Must match prisma/seed.ts.
 * Hide the list by setting NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="false".
 */
export const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== "false";

export const DEMO_PASSWORD = "Demo@123";

export const DEMO_ACCOUNTS: { email: string; role: string; scope: string }[] = [
  { email: "admin@demo.gov.in", role: "Admin", scope: "Both states" },
  { email: "cmo.rj@demo.gov.in", role: "CMO", scope: "Rajasthan" },
  { email: "pwd.rj@demo.gov.in", role: "Dept. Head", scope: "PWD · Rajasthan" },
  { email: "collector.jaipur@demo.gov.in", role: "Collector", scope: "Jaipur" },
  { email: "field.jaipur@demo.gov.in", role: "Field Officer", scope: "Jaipur" },
  { email: "cmo.mh@demo.gov.in", role: "CMO", scope: "Maharashtra" },
  { email: "pwd.mh@demo.gov.in", role: "Dept. Head", scope: "PWD · Maharashtra" },
  { email: "collector.pune@demo.gov.in", role: "Collector", scope: "Pune" },
  { email: "field.pune@demo.gov.in", role: "Field Officer", scope: "Pune" },
];
