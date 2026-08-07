-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "reminderSmsSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_reminderSmsSentAt_startsAt_idx" ON "Booking"("reminderSmsSentAt", "startsAt");
