-- CreateTable
CREATE TABLE "PricingMargin" (
    "id" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingMargin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingMargin_minPrice_idx" ON "PricingMargin"("minPrice");
