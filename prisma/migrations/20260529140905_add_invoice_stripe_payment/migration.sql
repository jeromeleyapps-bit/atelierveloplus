-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "stripePaidAt" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentLinkId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentLinkUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "stripePaymentStatus" TEXT;
