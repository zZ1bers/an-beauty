-- Password reset via email code
ALTER TABLE "User" ADD COLUMN "resetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "resetAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "resetSentAt" TIMESTAMP(3);
