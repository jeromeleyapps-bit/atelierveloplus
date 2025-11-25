/*
  Warnings:

  - You are about to alter the column `quantity` on the `WorkOrderLine` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

*/
-- CreateTable
CREATE TABLE "_schema_version" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applied_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 6,
    "maxConcurrent" INTEGER NOT NULL DEFAULT 1,
    "saturdayByAppt" BOOLEAN NOT NULL DEFAULT true,
    "businessHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CalendarConfig" ("businessHours", "createdAt", "id", "leadTimeHours", "maxConcurrent", "saturdayByAppt", "slotMinutes", "timezone", "updatedAt") SELECT "businessHours", "createdAt", "id", "leadTimeHours", "maxConcurrent", "saturdayByAppt", "slotMinutes", "timezone", "updatedAt" FROM "CalendarConfig";
DROP TABLE "CalendarConfig";
ALTER TABLE "new_CalendarConfig" RENAME TO "CalendarConfig";
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT,
    "number" TEXT,
    "issueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT NOT NULL DEFAULT 'invoice',
    "parentId" TEXT,
    "pricingMode" TEXT NOT NULL DEFAULT 'HT_TVA',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" REAL NOT NULL DEFAULT 20,
    "laborRate" REAL NOT NULL DEFAULT 60,
    "subtotalHT" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL DEFAULT 0,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "cancelledAt" DATETIME,
    "cancelledReason" TEXT,
    "dueDate" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" DATETIME,
    "validUntil" DATETIME,
    "convertedAt" DATETIME,
    "convertedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT,
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "customerId", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId") SELECT "cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "customerId", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE TABLE "new_WorkOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceHT" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "duration" INTEGER,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrderLine_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrderLine" ("createdAt", "description", "duration", "id", "notes", "priceHT", "quantity", "sourceId", "type", "updatedAt", "vatRate", "workOrderId") SELECT "createdAt", "description", "duration", "id", "notes", "priceHT", "quantity", "sourceId", "type", "updatedAt", "vatRate", "workOrderId" FROM "WorkOrderLine";
DROP TABLE "WorkOrderLine";
ALTER TABLE "new_WorkOrderLine" RENAME TO "WorkOrderLine";
CREATE INDEX "WorkOrderLine_type_idx" ON "WorkOrderLine"("type");
CREATE INDEX "WorkOrderLine_workOrderId_idx" ON "WorkOrderLine"("workOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "Bike_serialNumber_key";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_Bike_2" ON "Bike"("serialNumber");
Pragma writable_schema=0;
