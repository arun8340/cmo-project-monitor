/**
 * Demo mode (DEMO_MODE=true), for hosting the demo without a database service,
 * e.g. on Vercel.
 *
 * The repo ships a ready-made demo database and its imagery in demo/ (rebuilt
 * with `npm run demo:snapshot`). On start the app copies them into a writable
 * temporary folder and works from that copy, so signing in, editing and
 * uploading all work — but changes last only until the host recycles the
 * server, after which the original demo data is back.
 *
 * All dates are moved forward by the snapshot's age (whole days), so the demo
 * always looks as it did on the day it was made: due dates, "3 days ago",
 * planned progress and overdue counts don't drift. The exception is the real
 * site imagery: its capture dates are printed on the images themselves.
 */
import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { slotDate, slotOf, slotOnOrAfter } from "@/lib/meeting-slots";

export const DEMO_MODE = process.env.DEMO_MODE === "true";

const DAY = 86_400_000;

/** Columns not shifted, with the rows they are kept for (SQL condition). Must match prisma/site-imagery.ts. */
const KEEP_DATES: Record<string, Record<string, string>> = {
  ImageryCapture: { captureDate: `"filePath" LIKE 'sites/%'` },
  // A seeded verification compares two of those images.
  Verification: { fromDate: "1", toDate: "1" },
};

type DemoPaths = { dbFile: string; storageDir: string };
let prepared: DemoPaths | null = null;

/** Where the demo database and imagery live for this server (prepared on first use); null outside demo mode. */
export function demoPaths(): DemoPaths | null {
  if (!DEMO_MODE) return null;
  if (prepared) return prepared;

  const source = path.join(/*turbopackIgnore: true*/ process.cwd(), "demo");
  const dir = process.env.DEMO_DIR || path.join(os.tmpdir(), "cmo-demo");
  const dbFile = path.join(dir, "app.db");
  const storageDir = path.join(dir, "storage");

  if (!fs.existsSync(dbFile)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(path.join(source, "storage"), storageDir, { recursive: true });
    // Copy, shift dates, then rename, so a half-prepared file is never used.
    const tmp = `${dbFile}.${process.pid}.tmp`;
    fs.copyFileSync(path.join(source, "demo.db"), tmp);
    shiftDates(tmp, readSnapshotDate(source));
    fs.renameSync(tmp, dbFile);
  }
  prepared = { dbFile, storageDir };
  return prepared;
}

function readSnapshotDate(source: string): Date | null {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(source, "snapshot.json"), "utf8")) as { createdAt?: string };
    const d = meta.createdAt ? new Date(meta.createdAt) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/** Meeting-day columns: kept on the 15th / 30th (lib/meeting-slots.ts) rather than moved by days. */
const MEETING_DAY_COLUMNS: [table: string, column: string][] = [
  ["Meeting", "meetingAt"],
  ["Issue", "meetingDate"],
  ["Issue", "resolvedAt"],
];

/**
 * New values for meeting-day columns: a date on meeting slot k (counting from
 * the first meeting on or after the snapshot day) moves to slot k counting
 * from today, so "next meeting" stays the next 15th / 30th.
 */
function meetingDayUpdates(db: Database.Database, snapshot: Date) {
  const from = slotOnOrAfter(snapshot);
  const to = slotOnOrAfter(new Date());
  const updates: { table: string; column: string; rowid: number; value: string }[] = [];
  for (const [table, column] of MEETING_DAY_COLUMNS) {
    const rows = db.prepare(`SELECT rowid, "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL`).all() as { rowid: number; v: string }[];
    for (const r of rows) {
      const slot = slotOf(new Date(r.v));
      if (slot == null) continue;
      updates.push({ table, column, rowid: r.rowid, value: slotDate(to + slot - from).toISOString().replace("Z", "+00:00") });
    }
  }
  return updates;
}

/**
 * Moves every DATETIME column forward by the snapshot's age in whole days;
 * meeting days move to the matching 15th / 30th.
 */
function shiftDates(file: string, snapshot: Date | null) {
  if (!snapshot) return;
  const days = Math.floor((Date.now() - snapshot.getTime()) / DAY);
  if (days <= 0) return;
  const db = new Database(file);
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
      .all() as { name: string }[];
    const meetingDays = meetingDayUpdates(db, snapshot);
    const shift = db.transaction(() => {
      for (const { name } of tables) {
        const columns = db.prepare(`PRAGMA table_info("${name}")`).all() as { name: string; type: string }[];
        for (const col of columns.filter((c) => c.type.toUpperCase() === "DATETIME")) {
          const keep = KEEP_DATES[name]?.[col.name];
          // Same text format Prisma stores: 2026-10-16T16:07:33.744+00:00
          db.prepare(
            `UPDATE "${name}" SET "${col.name}" = strftime('%Y-%m-%dT%H:%M:%f+00:00', "${col.name}", ?) WHERE "${col.name}" IS NOT NULL${keep ? ` AND NOT (${keep})` : ""}`,
          ).run(`+${days} days`);
        }
      }
      for (const u of meetingDays) {
        db.prepare(`UPDATE "${u.table}" SET "${u.column}" = ? WHERE rowid = ?`).run(u.value, u.rowid);
      }
    });
    shift();
  } finally {
    db.close();
  }
}
