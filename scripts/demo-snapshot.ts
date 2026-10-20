/**
 * Rebuilds the demo data shipped in demo/ for DEMO_MODE deployments:
 * a fresh database (migrations + seed) and its generated imagery.
 *   npm run demo:snapshot
 * Uses its own files only — dev.db and storage/ are not touched.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const root = path.join(__dirname, "..");
const demo = path.join(root, "demo");
const dbFile = path.join(demo, "demo.db");
const env = { ...process.env, DATABASE_URL: `file:${dbFile}`, STORAGE_DIR: path.join(demo, "storage") };

fs.rmSync(demo, { recursive: true, force: true });
fs.mkdirSync(demo, { recursive: true });
const run = (cmd: string) => execSync(cmd, { cwd: root, env, stdio: "inherit" });
run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");

// Smaller file, no write-ahead log next to it.
const db = new Database(dbFile);
db.pragma("journal_mode = DELETE");
db.exec("VACUUM");
db.close();
for (const extra of ["-wal", "-shm", "-journal"]) fs.rmSync(dbFile + extra, { force: true });

fs.writeFileSync(path.join(demo, "snapshot.json"), JSON.stringify({ createdAt: new Date().toISOString() }, null, 2) + "\n");
console.log(`\n✔ Demo snapshot written to demo/ (${(fs.statSync(dbFile).size / 1024).toFixed(0)} KB database)`);
