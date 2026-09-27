-- Additive only: price range on services, optional guest email on walk-in bookings.
ALTER TABLE "Service" ADD COLUMN "priceMax" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "guestEmail" TEXT;
