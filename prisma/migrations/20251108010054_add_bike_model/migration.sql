-- CreateTable
CREATE TABLE "Bike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ROAD',
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT,
    "serialNumber" TEXT,
    "frameSize" TEXT,
    "frameMaterial" TEXT,
    "wheelSize" TEXT,
    "weight" REAL,
    "groupset" TEXT,
    "brakeType" TEXT,
    "drivetrain" TEXT,
    "fork" TEXT,
    "wheels" TEXT,
    "isElectric" BOOLEAN NOT NULL DEFAULT false,
    "motor" TEXT,
    "battery" INTEGER,
    "range" INTEGER,
    "conditionNotes" TEXT,
    "maintenanceHistory" TEXT,
    "purchasePriceHT" REAL NOT NULL,
    "sellingPriceHT" REAL NOT NULL,
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "stock" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "photos" TEXT,
    "internalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Bike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Bike_serialNumber_key" ON "Bike"("serialNumber");

-- CreateIndex
CREATE INDEX "Bike_userId_idx" ON "Bike"("userId");

-- CreateIndex
CREATE INDEX "Bike_userId_active_idx" ON "Bike"("userId", "active");

-- CreateIndex
CREATE INDEX "Bike_type_idx" ON "Bike"("type");

-- CreateIndex
CREATE INDEX "Bike_condition_idx" ON "Bike"("condition");

-- CreateIndex
CREATE INDEX "Bike_brand_idx" ON "Bike"("brand");
