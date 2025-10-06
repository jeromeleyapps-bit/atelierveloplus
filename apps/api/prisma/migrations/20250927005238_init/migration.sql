-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "inProgressAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3);
