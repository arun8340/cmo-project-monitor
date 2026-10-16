/**
 * Seeds the POC database with both states, all districts, departments, roles,
 * demo users, projects, progress history, imagery, issues and directives.
 *
 * Run:  npx prisma db seed      (or: npm run db:seed)
 * Safe to re-run — it wipes and recreates all data.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { STATES, STATE_CODES, type StateCode } from "../config/states";
import { ROLE_DEFINITIONS, ROLE_KEYS, type IssuePriority, type IssueStatus, type ProjectStatus } from "../lib/constants";
import { DISTRICTS } from "./seed-data/districts";
import { departmentsFor } from "./seed-data/departments";
import { PROJECTS, type ProjectSeed } from "./seed-data/projects";
import { generateDemoImagery, demoImagePath, stageForProgress, VARIANTS } from "./demo-imagery";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

export const DEMO_PASSWORD = "Demo@123";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic PRNG so every seed run produces the same demo data. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261015);
const between = (min: number, max: number) => min + rand() * (max - min);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

const NOW = new Date();
NOW.setHours(10, 0, 0, 0);
const DAY = 86_400_000;
const MONTH = 30.4 * DAY;
const addMonths = (d: Date, m: number) => new Date(d.getTime() + m * MONTH);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** Review meetings used to tag issues ("pending/resolved issues of last meeting"). */
const LAST_MEETING = addDays(NOW, -12);
const PREVIOUS_MEETING = addDays(NOW, -42);

const STATUS_FROM_CODE: Record<ProjectSeed["s"], ProjectStatus> = {
  N: "NOT_STARTED",
  O: "ONGOING",
  C: "COMPLETED",
  D: "DELAYED",
  S: "STALLED",
};

/** How many months before NOW a stalled project stopped moving. */
const STALLED_FOR_MONTHS = 4;

/**
 * Actual progress (0–100) of a project at a given date, according to its
 * status story: on-track, delayed (~60% of plan), stalled (flat for the last
 * few months) or completed.
 */
function progressAt(p: ProjectSeed, pace: number, date: Date): number {
  const start = addMonths(NOW, -p.startedMonthsAgo);
  let monthsIn = (date.getTime() - start.getTime()) / MONTH;
  if (monthsIn <= 0) return 0;
  if (p.s === "S") monthsIn = Math.min(monthsIn, p.startedMonthsAgo - STALLED_FOR_MONTHS);
  const planned = monthsIn / p.durationMonths;
  const factor = p.s === "C" ? 1.05 : p.s === "O" ? pace : 0.6;
  const value = Math.round(planned * factor * 100);
  const cap = p.s === "C" ? 100 : 95;
  return Math.max(0, Math.min(cap, value));
}

// ---------------------------------------------------------------------------
// Text templates
// ---------------------------------------------------------------------------

const PROGRESS_NOTES: Record<number, string[]> = {
  0: ["Site survey and baseline imagery captured", "Tender awarded; mobilisation pending"],
  1: ["Site clearance and fencing in progress", "Contractor mobilised; site office set up", "Utility shifting under way"],
  2: ["Excavation and foundation works in progress", "Pile / footing works ongoing", "Earthwork and sub-base laying"],
  3: ["Superstructure works progressing", "Slab casting completed for current section", "Major civil works ongoing; MEP started"],
  4: ["Finishing works and handover inspection", "Work completed; completion certificate issued"],
};

const ISSUE_TEMPLATES: { title: string; priority: IssuePriority }[] = [
  { title: "Land acquisition pending for part of the alignment", priority: "CRITICAL" },
  { title: "Utility shifting (electric poles / water line) awaited from DISCOM", priority: "HIGH" },
  { title: "Contractor running behind approved work schedule", priority: "HIGH" },
  { title: "Forest / environment clearance awaited", priority: "CRITICAL" },
  { title: "Payment of running bill delayed", priority: "MEDIUM" },
  { title: "Encroachment at site needs removal", priority: "HIGH" },
  { title: "Revised estimate pending technical sanction", priority: "MEDIUM" },
  { title: "Traffic diversion plan approval from police pending", priority: "MEDIUM" },
  { title: "Shortage of cement / steel at site", priority: "LOW" },
  { title: "Local residents' objection regarding drainage outlet", priority: "MEDIUM" },
  { title: "Quality test report of concrete samples awaited", priority: "LOW" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function wipe() {
  await db.auditLog.deleteMany();
  await db.directive.deleteMany();
  await db.issue.deleteMany();
  await db.progressUpdate.deleteMany();
  await db.imageryCapture.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
  await db.role.deleteMany();
  await db.department.deleteMany();
  await db.district.deleteMany();
  await db.state.deleteMany();
}

async function main() {
  console.log("Generating demo imagery → public/uploads/demo …");
  await generateDemoImagery();

  console.log("Clearing existing data …");
  await wipe();

  // Roles
  const roles = Object.fromEntries(
    await Promise.all(
      ROLE_KEYS.map(async (key) => {
        const def = ROLE_DEFINITIONS[key];
        const role = await db.role.create({
          data: { key, name: def.name, description: def.description, permissions: JSON.stringify(def.permissions) },
        });
        return [key, role] as const;
      }),
    ),
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.user.create({
    data: {
      name: "System Administrator",
      email: "admin@demo.gov.in",
      passwordHash,
      designation: "Administrator",
      roleId: roles.ADMIN.id,
    },
  });

  // Per-state demo users. Collector / field officer district and the department
  // head's department are chosen so they have projects to see.
  const USER_PLAN: Record<StateCode, { collectorDistrict: string; collectorName: string; cmoName: string; deptHeadName: string; fieldName: string }> = {
    RJ: { collectorDistrict: "RJ-JAIPUR", collectorName: "Collector, Jaipur", cmoName: "CMO Rajasthan", deptHeadName: "Secretary, PWD Rajasthan", fieldName: "Field Officer, Jaipur" },
    MH: { collectorDistrict: "MH-PUNE", collectorName: "Collector, Pune", cmoName: "CMO Maharashtra", deptHeadName: "Secretary, PWD Maharashtra", fieldName: "Field Officer, Pune" },
  };

  let projectCount = 0;
  let imageryCount = 0;

  for (const code of STATE_CODES) {
    const cfg = STATES[code];
    console.log(`Seeding ${cfg.name} …`);
    const state = await db.state.create({ data: { code, name: cfg.name, nameLocal: cfg.nameLocal } });

    const districts = new Map<string, { id: string; center: [number, number] }>();
    for (const d of DISTRICTS[code]) {
      const row = await db.district.create({
        data: {
          stateId: state.id,
          name: d.name,
          nameLocal: d.nameLocal,
          geoCode: d.geoCode,
          latitude: d.center[0],
          longitude: d.center[1],
        },
      });
      districts.set(d.geoCode, { id: row.id, center: d.center });
    }

    const departments = new Map<string, string>();
    for (const d of departmentsFor(code)) {
      const row = await db.department.create({ data: { stateId: state.id, ...d } });
      departments.set(d.code, row.id);
    }

    const plan = USER_PLAN[code];
    const slug = plan.collectorDistrict.split("-").slice(1).join("-").toLowerCase();
    const s = code.toLowerCase();

    const cmo = await db.user.create({
      data: { name: plan.cmoName, email: `cmo.${s}@demo.gov.in`, passwordHash, designation: "Chief Minister's Office", roleId: roles.CMO.id, stateId: state.id },
    });
    await db.user.create({
      data: { name: plan.deptHeadName, email: `pwd.${s}@demo.gov.in`, passwordHash, designation: "Department Head", roleId: roles.DEPARTMENT_HEAD.id, stateId: state.id, departmentId: departments.get("PWD")! },
    });
    const collector = await db.user.create({
      data: { name: plan.collectorName, email: `collector.${slug}@demo.gov.in`, passwordHash, designation: "District Collector", roleId: roles.DISTRICT_COLLECTOR.id, stateId: state.id, districtId: districts.get(plan.collectorDistrict)!.id },
    });
    const fieldOfficer = await db.user.create({
      data: { name: plan.fieldName, email: `field.${slug}@demo.gov.in`, passwordHash, designation: "Assistant Engineer", roleId: roles.FIELD_OFFICER.id, stateId: state.id, districtId: districts.get(plan.collectorDistrict)!.id },
    });

    const createdProjects: { id: string; seed: ProjectSeed; status: ProjectStatus; districtId: string; departmentId: string }[] = [];

    for (const p of PROJECTS[code]) {
      const district = districts.get(p.district);
      const departmentId = departments.get(p.dept);
      if (!district || !departmentId) throw new Error(`Unknown district/department in seed: ${p.district} / ${p.dept}`);

      const status = STATUS_FROM_CODE[p.s];
      const pace = between(0.92, 1.05);
      const start = p.s === "N" ? addMonths(NOW, 1) : addMonths(NOW, -p.startedMonthsAgo);
      const plannedEnd = addMonths(start, p.durationMonths);
      const progress = p.s === "N" ? 0 : progressAt(p, pace, NOW);
      // Scatter sites within ~8 km of the district HQ
      const lat = district.center[0] + between(-0.07, 0.07);
      const lng = district.center[1] + between(-0.07, 0.07);
      const variant = Math.floor(rand() * VARIANTS);
      const isCollectorDistrict = p.district === plan.collectorDistrict;

      const project = await db.project.create({
        data: {
          districtId: district.id,
          departmentId,
          name: p.name,
          nameLocal: p.nameLocal,
          description: `${p.name} — ${p.durationMonths}-month works contract under the ${departmentsFor(code).find((d) => d.code === p.dept)?.name ?? p.dept} department.`,
          latitude: lat,
          longitude: lng,
          budgetLakhs: p.budgetLakhs,
          startDate: start,
          plannedEndDate: plannedEnd,
          status,
          progressPercent: progress,
          createdById: isCollectorDistrict ? collector.id : null,
          createdAt: addMonths(start, -1),
          assignedOfficers: isCollectorDistrict && rand() < 0.5 ? { connect: { id: fieldOfficer.id } } : undefined,
        },
      });
      projectCount++;
      createdProjects.push({ id: project.id, seed: p, status, districtId: district.id, departmentId });

      await db.auditLog.create({
        data: {
          userId: isCollectorDistrict ? collector.id : null,
          action: "project.create",
          entityType: "Project",
          entityId: project.id,
          details: JSON.stringify({ name: p.name }),
          createdAt: addMonths(start, -1),
        },
      });

      // Monthly progress updates from start until now (or completion / stall)
      if (p.s !== "N") {
        let last = -1;
        const end = p.s === "C" ? plannedEnd : p.s === "S" ? addMonths(NOW, -STALLED_FOR_MONTHS) : NOW;
        for (let d = addMonths(start, 1); d <= end; d = addMonths(d, 1)) {
          const value = progressAt(p, pace, d);
          if (value === last) continue;
          last = value;
          await db.progressUpdate.create({
            data: {
              projectId: project.id,
              date: d,
              progressPercent: value,
              notes: pick(PROGRESS_NOTES[stageForProgress(value)]),
              updatedById: isCollectorDistrict ? (rand() < 0.5 ? collector.id : fieldOfficer.id) : null,
            },
          });
        }
        if (p.s === "C" && last !== 100) {
          await db.progressUpdate.create({
            data: { projectId: project.id, date: plannedEnd, progressPercent: 100, notes: PROGRESS_NOTES[4][1] },
          });
        }
      }

      // Imagery: baseline before start, a mid-point, and a recent capture
      const captureDates: Date[] =
        p.s === "N"
          ? [addMonths(NOW, -3), addDays(NOW, -Math.round(between(5, 20)))]
          : [
              addMonths(start, -1),
              addMonths(start, Math.min(p.startedMonthsAgo, p.durationMonths) * 0.4),
              addMonths(start, Math.min(p.startedMonthsAgo, p.durationMonths) * 0.75),
              addDays(NOW, -Math.round(between(3, 20))),
            ];
      for (const [i, date] of captureDates.entries()) {
        const value = p.s === "N" ? 0 : i === 0 ? 0 : p.s === "C" && i === captureDates.length - 1 ? 100 : progressAt(p, pace, date);
        const latest = i === captureDates.length - 1;
        const source = latest && rand() < 0.4 ? "DRONE" : "SATELLITE";
        await db.imageryCapture.create({
          data: {
            projectId: project.id,
            captureDate: date,
            source,
            filePath: demoImagePath(p.layout, stageForProgress(value), variant),
            notes: i === 0 ? "Baseline imagery before work start" : `Progress reported at capture time: ${value}%`,
            uploadedById: isCollectorDistrict ? collector.id : null,
          },
        });
        imageryCount++;
      }

      // Issues: delayed/stalled projects carry open issues from the last
      // review meeting; on-going ones have some resolved history.
      const issueCount = p.s === "D" || p.s === "S" ? 2 : p.s === "O" ? (rand() < 0.5 ? 1 : 0) : 0;
      for (let i = 0; i < issueCount; i++) {
        const tpl = pick(ISSUE_TEMPLATES);
        let issueStatus: IssueStatus;
        let meetingDate: Date | null;
        if (p.s === "D" || p.s === "S") {
          issueStatus = i === 0 ? "PENDING" : pick(["IN_PROGRESS", "PENDING"] as const);
          meetingDate = rand() < 0.75 ? LAST_MEETING : PREVIOUS_MEETING;
        } else {
          issueStatus = pick(["RESOLVED", "RESOLVED", "RESOLVED", "IN_PROGRESS", "RESOLVED", "ARCHIVED"] as const);
          meetingDate = rand() < 0.6 ? PREVIOUS_MEETING : null;
        }
        const createdAt = meetingDate ?? addDays(NOW, -Math.round(between(10, 90)));
        await db.issue.create({
          data: {
            projectId: project.id,
            title: tpl.title,
            description: `Raised during review of "${p.name}".`,
            status: issueStatus,
            priority: tpl.priority,
            meetingDate,
            resolvedAt: issueStatus === "RESOLVED" ? (meetingDate ? LAST_MEETING : addDays(createdAt, 20)) : null,
            createdById: isCollectorDistrict ? collector.id : cmo.id,
            createdAt,
          },
        });
      }
    }

    // Directives from the CMO: to a district, to a department, and to specific
    // problem projects. Some are overdue.
    const problem = createdProjects.filter((p) => p.status === "DELAYED" || p.status === "STALLED");
    const collectorDistrictId = districts.get(plan.collectorDistrict)!.id;
    const directives = [
      {
        districtId: collectorDistrictId,
        text: "Submit a consolidated status report of all delayed projects in the district with revised timelines before the next review meeting.",
        dueDate: addDays(NOW, 7),
        status: "OPEN",
        ownerId: collector.id,
      },
      {
        departmentId: departments.get("DRAINAGE")!,
        text: "Complete pre-monsoon desilting and inspection of all storm water drains under construction; upload geotagged field photos.",
        dueDate: addDays(NOW, -10),
        status: "IN_PROGRESS",
      },
      {
        departmentId: departments.get("PWD")!,
        text: "Ensure third-party quality audit for all hospital and health infrastructure projects above ₹10 crore.",
        dueDate: addDays(NOW, -25),
        status: "COMPLIED",
      },
      ...problem.slice(0, 3).map((p, i) => ({
        projectId: p.id,
        districtId: p.districtId,
        departmentId: p.departmentId,
        text:
          p.status === "STALLED"
            ? `Work on "${p.seed.name}" has stalled. Resolve contractor issues and restart work within 15 days; report to CMO.`
            : `"${p.seed.name}" is behind schedule. Submit a recovery plan with weekly milestones.`,
        dueDate: addDays(NOW, i === 0 ? -5 : 14 - i * 3),
        status: "OPEN",
        ownerId: p.districtId === collectorDistrictId ? collector.id : undefined,
      })),
    ];
    for (const d of directives) {
      await db.directive.create({
        data: { fromUserId: cmo.id, createdAt: addDays(NOW, -30 + Math.round(between(0, 20))), ...d },
      });
    }
  }

  console.log(`\n✔ Seed complete: ${projectCount} projects, ${imageryCount} imagery captures.`);
  console.log(`  All demo users use the password: ${DEMO_PASSWORD}  (see README)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
