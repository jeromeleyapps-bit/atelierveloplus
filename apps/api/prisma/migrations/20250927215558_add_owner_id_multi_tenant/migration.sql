-- AlterTable
ALTER TABLE "Bike" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Unavailability" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Bike_ownerId_idx" ON "Bike"("ownerId");

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE INDEX "Sale_ownerId_idx" ON "Sale"("ownerId");

-- CreateIndex
CREATE INDEX "Unavailability_ownerId_idx" ON "Unavailability"("ownerId");

-- CreateIndex
CREATE INDEX "WorkOrder_ownerId_idx" ON "WorkOrder"("ownerId");
