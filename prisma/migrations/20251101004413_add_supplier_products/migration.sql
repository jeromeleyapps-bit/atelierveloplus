-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "priceHT" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "supplierName" TEXT NOT NULL DEFAULT 'Fournisseur',
    "lastImport" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SupplierProduct_userId_category_idx" ON "SupplierProduct"("userId", "category");

-- CreateIndex
CREATE INDEX "SupplierProduct_userId_name_idx" ON "SupplierProduct"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_userId_reference_key" ON "SupplierProduct"("userId", "reference");
