-- CreateTable
CREATE TABLE "IssueUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueUpdate_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectiveUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "directiveId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectiveUpdate_directiveId_fkey" FOREIGN KEY ("directiveId") REFERENCES "Directive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectiveUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "IssueUpdate_issueId_createdAt_idx" ON "IssueUpdate"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectiveUpdate_directiveId_createdAt_idx" ON "DirectiveUpdate"("directiveId", "createdAt");

-- Field Officers can raise issues on their assigned projects (new databases get this from the seed).
UPDATE "Role"
SET "permissions" = json_insert("permissions", '$[#]', 'issues.create')
WHERE "key" = 'FIELD_OFFICER' AND "permissions" NOT LIKE '%issues.create%';

-- Backfill history for existing issues: when raised, and their current status if it has moved on.
INSERT INTO "IssueUpdate" ("id", "issueId", "fromStatus", "toStatus", "note", "userId", "createdAt")
SELECT 'bf' || lower(hex(randomblob(11))), "id", NULL, 'PENDING', NULL, "createdById", "createdAt" FROM "Issue";
INSERT INTO "IssueUpdate" ("id", "issueId", "fromStatus", "toStatus", "note", "userId", "createdAt")
SELECT 'bf' || lower(hex(randomblob(11))), "id", 'PENDING', "status", NULL, NULL, COALESCE("resolvedAt", "updatedAt")
FROM "Issue" WHERE "status" <> 'PENDING';

-- Backfill history for existing directives: when issued, and their current status if it has moved on.
INSERT INTO "DirectiveUpdate" ("id", "directiveId", "fromStatus", "toStatus", "note", "userId", "createdAt")
SELECT 'bf' || lower(hex(randomblob(11))), "id", NULL, 'OPEN', NULL, "fromUserId", "createdAt" FROM "Directive";
INSERT INTO "DirectiveUpdate" ("id", "directiveId", "fromStatus", "toStatus", "note", "userId", "createdAt")
SELECT 'bf' || lower(hex(randomblob(11))), "id", 'OPEN', "status", NULL, NULL, "updatedAt"
FROM "Directive" WHERE "status" <> 'OPEN';
