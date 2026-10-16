-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "imageIds" TEXT NOT NULL,
    "fromDate" DATETIME NOT NULL,
    "toDate" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Verification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Verification_projectId_createdAt_idx" ON "Verification"("projectId", "createdAt");

-- Grant the new permission to existing roles (new databases get it from the seed).
UPDATE "Role"
SET "permissions" = json_insert("permissions", '$[#]', 'verification.record')
WHERE "key" IN ('ADMIN', 'CMO', 'DEPARTMENT_HEAD', 'DISTRICT_COLLECTOR')
  AND "permissions" NOT LIKE '%verification.record%';
