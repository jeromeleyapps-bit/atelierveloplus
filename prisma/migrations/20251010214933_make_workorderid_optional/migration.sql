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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Invoice" ("cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId") SELECT "cancelledAt", "cancelledReason", "convertedAt", "convertedToId", "createdAt", "currency", "discountAmount", "dueDate", "id", "issueDate", "laborRate", "lastReminderAt", "number", "paidAt", "parentId", "paymentMethod", "pricingMode", "reminderCount", "status", "subtotalHT", "totalTTC", "type", "updatedAt", "validUntil", "vatAmount", "vatRate", "workOrderId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
