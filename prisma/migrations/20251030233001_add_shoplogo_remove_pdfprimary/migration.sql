/*
  Warnings:

  - You are about to drop the column `pdfPrimary` on the `AppSetting` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopEmail" TEXT,
    "shopPhone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT,
    "shopLogo" TEXT,
    "legalFooter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "capital" TEXT,
    "insurance" TEXT,
    "rcs" TEXT,
    "siret" TEXT,
    "tva" TEXT,
    "isAutoEntrepreneur" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AppSetting" ("address1", "address2", "capital", "city", "country", "createdAt", "id", "insurance", "isAutoEntrepreneur", "legalFooter", "rcs", "shopEmail", "shopName", "shopPhone", "siret", "tva", "updatedAt", "userId", "zip") SELECT "address1", "address2", "capital", "city", "country", "createdAt", "id", "insurance", "isAutoEntrepreneur", "legalFooter", "rcs", "shopEmail", "shopName", "shopPhone", "siret", "tva", "updatedAt", "userId", "zip" FROM "AppSetting";
DROP TABLE "AppSetting";
ALTER TABLE "new_AppSetting" RENAME TO "AppSetting";
CREATE UNIQUE INDEX "AppSetting_userId_key" ON "AppSetting"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
