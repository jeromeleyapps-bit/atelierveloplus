-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "clientSignature" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "clientSignedAt" DATETIME;
ALTER TABLE "WorkOrder" ADD COLUMN "clientSignedName" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "intakeAccessories" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "intakeCondition" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "intakeSignature" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "intakeSignedAt" DATETIME;

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServicePackageLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "priceHT" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 20,
    "duration" INTEGER,
    CONSTRAINT "ServicePackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT,
    "invoiceId" TEXT,
    "amount" REAL NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ServicePackageLine_packageId_idx" ON "ServicePackageLine"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_receiptNumber_key" ON "Deposit"("receiptNumber");

-- CreateIndex
CREATE INDEX "Deposit_workOrderId_idx" ON "Deposit"("workOrderId");

-- CreateIndex
CREATE INDEX "Deposit_invoiceId_idx" ON "Deposit"("invoiceId");
