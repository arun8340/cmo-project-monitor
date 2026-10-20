import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Optional: demo deployments (DEMO_MODE) have no DATABASE_URL, and `prisma generate` runs on install.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
