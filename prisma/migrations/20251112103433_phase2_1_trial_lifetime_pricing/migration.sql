/*
  Warnings:

  - You are about to drop the column `emailsThisWeek` on the `License` table. All the data in the column will be lost.
  - You are about to drop the column `maxEmailsPerWeek` on the `License` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basique',
    "status" TEXT NOT NULL DEFAULT 'active',
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "lastVerified" DATETIME,
    "verificationToken" TEXT,
    "trialStartedAt" DATETIME,
    "trialEndsAt" DATETIME,
    "isLifetime" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceExpiresAt" DATETIME,
    "maxEmailsPerMonth" INTEGER NOT NULL DEFAULT 30,
    "emailsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "emailResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "advancedStatsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pdfDirectSendEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "hardwareId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_License" ("activatedAt", "advancedStatsEnabled", "bookingEnabled", "createdAt", "customerEmail", "customerName", "emailResetDate", "expiresAt", "hardwareId", "id", "key", "lastVerified", "marketingEnabled", "status", "tier", "updatedAt", "verificationToken") SELECT "activatedAt", "advancedStatsEnabled", "bookingEnabled", "createdAt", "customerEmail", "customerName", "emailResetDate", "expiresAt", "hardwareId", "id", "key", "lastVerified", "marketingEnabled", "status", "tier", "updatedAt", "verificationToken" FROM "License";
DROP TABLE "License";
ALTER TABLE "new_License" RENAME TO "License";
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
