/*
  Warnings:

  - You are about to drop the `Unavailability` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Bike" ADD COLUMN "mileage" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Unavailability";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AppointmentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "openingDays" TEXT NOT NULL DEFAULT '{"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"saturday":false,"sunday":false}',
    "openingHours" TEXT NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"18:00"},"tuesday":{"start":"09:00","end":"18:00"},"wednesday":{"start":"09:00","end":"18:00"},"thursday":{"start":"09:00","end":"18:00"},"friday":{"start":"09:00","end":"18:00"},"saturday":{"start":"10:00","end":"17:00"},"sunday":{"start":"09:00","end":"18:00"}}',
    "appointmentOnlyDayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentOnlyDay" TEXT,
    "appointmentOnlyDayPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppointmentConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentConfig_userId_key" ON "AppointmentConfig"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_customerId_status_idx" ON "Invoice"("customerId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_status_createdAt_idx" ON "WorkOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_status_idx" ON "WorkOrder"("customerId", "status");
