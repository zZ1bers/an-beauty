-- Walk-in bookings: optional client + guest contact fields
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_clientId_fkey";

ALTER TABLE "Booking" ALTER COLUMN "clientId" DROP NOT NULL;

ALTER TABLE "Booking" ADD COLUMN "guestFirstName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestLastName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestPhone" TEXT;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
