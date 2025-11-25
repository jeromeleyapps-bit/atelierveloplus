-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basique',
    "status" TEXT NOT NULL DEFAULT 'active',
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "lastVerified" DATETIME,
    "verificationToken" TEXT,
    "maxEmailsPerWeek" INTEGER NOT NULL DEFAULT 50,
    "emailsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "emailResetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "advancedStatsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "hardwareId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LicenseVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licenseId" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" TEXT,
    "errorMessage" TEXT,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LicenseVerification_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE INDEX "LicenseVerification_licenseId_idx" ON "LicenseVerification"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseVerification_verifiedAt_idx" ON "LicenseVerification"("verifiedAt");
