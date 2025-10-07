-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "appointmentDate" TIMESTAMP(3),
ADD COLUMN     "calendarEventId" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrder_appointmentDate_idx" ON "WorkOrder"("appointmentDate");

-- CreateIndex
CREATE INDEX "WorkOrder_calendarEventId_idx" ON "WorkOrder"("calendarEventId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
