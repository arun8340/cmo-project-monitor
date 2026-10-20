/**
 * Verifies role-based data scoping against the seeded demo data.
 * Run: npm run check:scopes   (after `npm run db:seed`)
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { STATE_CODES, type StateCode } from "../config/states";
import type { RoleKey } from "../lib/constants";
import { departmentScope, directiveScope, districtScope, issueScope, projectScope, type ScopeUser } from "../lib/auth/scope";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

/** Expected visible project counts per user per state, from prisma/seed-data/projects.ts */
const EXPECTED: Record<string, Record<StateCode, number>> = {
  "admin@demo.gov.in": { RJ: 33, MH: 31 },
  "cmo.rj@demo.gov.in": { RJ: 33, MH: 0 },
  "cmo.mh@demo.gov.in": { RJ: 0, MH: 31 },
  "pwd.rj@demo.gov.in": { RJ: 5, MH: 0 },
  "pwd.mh@demo.gov.in": { RJ: 0, MH: 4 },
  "collector.jaipur@demo.gov.in": { RJ: 14, MH: 0 },
  "collector.pune@demo.gov.in": { RJ: 0, MH: 10 },
  "field.jaipur@demo.gov.in": { RJ: 7, MH: 0 },
  "field.pune@demo.gov.in": { RJ: 0, MH: 4 },
};

async function main() {
  const users = await db.user.findMany({ include: { role: true, state: true }, orderBy: { email: "asc" } });
  let failures = 0;

  console.log("user".padEnd(32), "state", "projects", "issues", "directives", "districts", "departments");
  for (const u of users) {
    const scopeUser: ScopeUser = {
      id: u.id,
      roleKey: u.role.key as RoleKey,
      stateId: u.stateId,
      stateCode: (u.state?.code as StateCode | undefined) ?? null,
      districtId: u.districtId,
      departmentId: u.departmentId,
    };

    for (const code of STATE_CODES) {
      const [projects, issues, directives, districts, departments] = await Promise.all([
        db.project.count({ where: projectScope(scopeUser, code) }),
        db.issue.count({ where: issueScope(scopeUser, code) }),
        db.directive.count({ where: directiveScope(scopeUser, code) }),
        db.district.count({ where: districtScope(scopeUser, code) }),
        db.department.count({ where: departmentScope(scopeUser, code) }),
      ]);

      const expected = EXPECTED[u.email]?.[code];
      const ok = expected === undefined || expected === projects;
      // Out-of-state access must yield nothing at all.
      const crossStateLeak = expected === 0 && issues + directives + districts + departments > 0;
      if (!ok || crossStateLeak) failures++;

      console.log(
        u.email.padEnd(32),
        code.padEnd(5),
        String(projects).padEnd(8),
        String(issues).padEnd(6),
        String(directives).padEnd(10),
        String(districts).padEnd(9),
        String(departments).padEnd(11),
        ok && !crossStateLeak ? "✔" : `✘ expected ${expected} projects${crossStateLeak ? ", cross-state leak" : ""}`,
      );
    }
  }

  console.log(failures ? `\n✘ ${failures} scope check(s) failed` : "\n✔ All scope checks passed");
  process.exitCode = failures ? 1 : 0;
}

main().finally(() => db.$disconnect());
