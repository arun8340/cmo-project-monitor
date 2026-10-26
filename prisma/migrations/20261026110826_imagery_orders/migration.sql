-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "turnaroundDays" INTEGER NOT NULL DEFAULT 3,
    "contact" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vendor_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageryCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "captureDate" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "notes" TEXT,
    "exifLatitude" REAL,
    "exifLongitude" REAL,
    "exifTakenAt" DATETIME,
    "uploadedById" TEXT,
    "requestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageryCapture_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageryCapture_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImageryCapture_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ImageryRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImageryCapture" ("captureDate", "createdAt", "exifLatitude", "exifLongitude", "exifTakenAt", "filePath", "height", "id", "mimeType", "notes", "projectId", "sizeBytes", "source", "uploadedById", "width") SELECT "captureDate", "createdAt", "exifLatitude", "exifLongitude", "exifTakenAt", "filePath", "height", "id", "mimeType", "notes", "projectId", "sizeBytes", "source", "uploadedById", "width" FROM "ImageryCapture";
DROP TABLE "ImageryCapture";
ALTER TABLE "new_ImageryCapture" RENAME TO "ImageryCapture";
CREATE INDEX "ImageryCapture_projectId_captureDate_idx" ON "ImageryCapture"("projectId", "captureDate");
CREATE TABLE "new_ImageryRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "neededBy" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "requestedById" TEXT NOT NULL,
    "vendorId" TEXT,
    "orderRef" TEXT,
    "orderedAt" DATETIME,
    "expectedBy" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImageryRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImageryRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImageryRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImageryRequest" ("createdAt", "id", "neededBy", "priority", "projectId", "purpose", "requestedById", "status", "type", "updatedAt") SELECT "createdAt", "id", "neededBy", "priority", "projectId", "purpose", "requestedById", "status", "type", "updatedAt" FROM "ImageryRequest";
DROP TABLE "ImageryRequest";
ALTER TABLE "new_ImageryRequest" RENAME TO "ImageryRequest";
CREATE INDEX "ImageryRequest_projectId_idx" ON "ImageryRequest"("projectId");
CREATE INDEX "ImageryRequest_status_idx" ON "ImageryRequest"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Vendor_stateId_type_idx" ON "Vendor"("stateId", "type");
