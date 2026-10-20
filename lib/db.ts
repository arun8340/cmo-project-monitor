import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { demoPaths } from "@/lib/demo";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const demo = demoPaths(); // demo mode: a temporary copy of the bundled demo database
  const adapter = new PrismaBetterSqlite3({ url: demo ? `file:${demo.dbFile}` : (process.env.DATABASE_URL ?? "file:./dev.db") });
  return new PrismaClient({ adapter });
}

/**
 * A client cached before a migration doesn't know about newly added models
 * (e.g. `db.verification` would be undefined until the dev server restarts).
 * Treat it as stale if any model of the current generated client is missing.
 */
function isCurrent(client: PrismaClient) {
  return Object.values(Prisma.ModelName).every((name) => name.charAt(0).toLowerCase() + name.slice(1) in client);
}

const cached = globalForPrisma.prisma;
if (cached && !isCurrent(cached)) void cached.$disconnect().catch(() => {});

export const db = cached && isCurrent(cached) ? cached : createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
