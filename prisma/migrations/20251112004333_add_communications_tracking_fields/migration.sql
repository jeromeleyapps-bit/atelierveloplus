-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "bikeBrand" TEXT,
    "bikeModel" TEXT,
    "nationalFileId" TEXT,
    "shipAddress1" TEXT,
    "shipAddress2" TEXT,
    "shipZip" TEXT,
    "shipCity" TEXT,
    "shipCountry" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastServiceDate" DATETIME,
    "maintenanceInterval" INTEGER NOT NULL DEFAULT 6,
    "maintenanceReminderSent" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceReminderSentAt" DATETIME,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Customer" ("address1", "address2", "bikeBrand", "bikeModel", "city", "country", "createdAt", "email", "firstName", "id", "lastName", "nationalFileId", "notes", "phone", "shipAddress1", "shipAddress2", "shipCity", "shipCountry", "shipZip", "updatedAt", "zip") SELECT "address1", "address2", "bikeBrand", "bikeModel", "city", "country", "createdAt", "email", "firstName", "id", "lastName", "nationalFileId", "notes", "phone", "shipAddress1", "shipAddress2", "shipCity", "shipCountry", "shipZip", "updatedAt", "zip" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE INDEX "Customer_lastServiceDate_idx" ON "Customer"("lastServiceDate");
CREATE INDEX "Customer_maintenanceReminderSent_idx" ON "Customer"("maintenanceReminderSent");
CREATE INDEX "Customer_marketingOptIn_idx" ON "Customer"("marketingOptIn");
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'created',
    "customerId" TEXT,
    "bikeId" TEXT,
    "type" TEXT DEFAULT 'repair',
    "estimatedMinutes" INTEGER,
    "hourlyRate" REAL,
    "appointmentDate" DATETIME,
    "calendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "satisfactionEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "satisfactionEmailSentAt" DATETIME,
    "satisfactionRating" INTEGER,
    "satisfactionComment" TEXT,
    CONSTRAINT "WorkOrder_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "CustomerBike" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("appointmentDate", "bikeId", "calendarEventId", "createdAt", "customerId", "dueAt", "estimatedMinutes", "hourlyRate", "id", "status", "type", "updatedAt") SELECT "appointmentDate", "bikeId", "calendarEventId", "createdAt", "customerId", "dueAt", "estimatedMinutes", "hourlyRate", "id", "status", "type", "updatedAt" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");
CREATE INDEX "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX "WorkOrder_completedAt_idx" ON "WorkOrder"("completedAt");
CREATE INDEX "WorkOrder_satisfactionEmailSent_idx" ON "WorkOrder"("satisfactionEmailSent");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
