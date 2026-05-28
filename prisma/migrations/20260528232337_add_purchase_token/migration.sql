-- CreateTable
CREATE TABLE "PurchaseToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "redeemedAt" DATETIME,
    "licenseKey" TEXT,
    "hardwareId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseToken_token_key" ON "PurchaseToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseToken_orderId_key" ON "PurchaseToken"("orderId");

-- CreateIndex
CREATE INDEX "PurchaseToken_email_idx" ON "PurchaseToken"("email");
