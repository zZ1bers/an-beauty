-- Additive only: explicit open windows for default-closed calendar from 2026-10-01.
CREATE TABLE "MasterOpen" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "MasterOpen_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterOpen_masterId_startsAt_idx" ON "MasterOpen"("masterId", "startsAt");

ALTER TABLE "MasterOpen" ADD CONSTRAINT "MasterOpen_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
