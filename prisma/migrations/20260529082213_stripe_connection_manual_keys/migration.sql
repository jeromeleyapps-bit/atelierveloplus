/*
  Warnings:

  - You are about to drop the column `accessToken` on the `StripeConnection` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `StripeConnection` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `StripeConnection` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountId` on the `StripeConnection` table. All the data in the column will be lost.
  - Added the required column `publishableKey` to the `StripeConnection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secretKeyEncrypted` to the `StripeConnection` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StripeConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "publishableKey" TEXT NOT NULL,
    "secretKeyEncrypted" TEXT NOT NULL,
    "accountLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StripeConnection" ("connectedAt", "id", "livemode", "status", "updatedAt", "userId") SELECT "connectedAt", "id", "livemode", "status", "updatedAt", "userId" FROM "StripeConnection";
DROP TABLE "StripeConnection";
ALTER TABLE "new_StripeConnection" RENAME TO "StripeConnection";
CREATE UNIQUE INDEX "StripeConnection_userId_key" ON "StripeConnection"("userId");
CREATE INDEX "StripeConnection_userId_idx" ON "StripeConnection"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
