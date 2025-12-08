-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SystemSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activityLogsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "emailProvider" TEXT NOT NULL DEFAULT 'resend',
    "emailApiKey" TEXT,
    "emailFromAddress" TEXT,
    "emailFromName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "requireAdmin2FA" BOOLEAN NOT NULL DEFAULT false,
    "hardDeleteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "securityAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tunnelConfigured" BOOLEAN NOT NULL DEFAULT false,
    "tunnelHostname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SystemSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SystemSettings" ("activityLogsEnabled", "autoBackupEnabled", "backupFrequency", "createdAt", "emailApiKey", "emailFromAddress", "emailFromName", "emailNotificationsEnabled", "emailProvider", "hardDeleteEnabled", "id", "maintenanceMode", "notificationsEnabled", "requireAdmin2FA", "securityAlertsEnabled", "tunnelConfigured", "tunnelHostname", "updatedAt", "userId") SELECT "activityLogsEnabled", "autoBackupEnabled", "backupFrequency", "createdAt", "emailApiKey", "emailFromAddress", "emailFromName", "emailNotificationsEnabled", "emailProvider", "hardDeleteEnabled", "id", "maintenanceMode", "notificationsEnabled", "requireAdmin2FA", "securityAlertsEnabled", "tunnelConfigured", "tunnelHostname", "updatedAt", "userId" FROM "SystemSettings";
DROP TABLE "SystemSettings";
ALTER TABLE "new_SystemSettings" RENAME TO "SystemSettings";
CREATE UNIQUE INDEX "SystemSettings_userId_key" ON "SystemSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
