/*
  Warnings:

  - You are about to drop the `WorkOrderPart` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "WorkOrder_calendarEventId_idx";

-- DropIndex
DROP INDEX "WorkOrder_appointmentDate_idx";

-- AlterTable
ALTER TABLE "CustomerBike" ADD COLUMN "brakeType" TEXT;
ALTER TABLE "CustomerBike" ADD COLUMN "frameMaterial" TEXT;
ALTER TABLE "CustomerBike" ADD COLUMN "frameSize" TEXT;
ALTER TABLE "CustomerBike" ADD COLUMN "gearSystem" TEXT;
ALTER TABLE "CustomerBike" ADD COLUMN "tireSize" TEXT;
ALTER TABLE "CustomerBike" ADD COLUMN "wheelSize" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WorkOrderPart";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ServiceRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceHT" REAL NOT NULL,
    "bikeType" TEXT,
    "category" TEXT,
    "duration" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkOrderLine" (
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId") SELECT "cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ServiceRate_active_idx" ON "ServiceRate"("active");

-- CreateIndex
CREATE INDEX "ServiceRate_bikeType_idx" ON "ServiceRate"("bikeType");

-- CreateIndex
CREATE INDEX "ServiceRate_category_idx" ON "ServiceRate"("category");

-- CreateIndex
CREATE INDEX "WorkOrderLine_workOrderId_idx" ON "WorkOrderLine"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderLine_type_idx" ON "WorkOrderLine"("type");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");
