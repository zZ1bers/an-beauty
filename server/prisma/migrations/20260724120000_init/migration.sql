-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'MASTER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ru', 'de');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING', 'PROMO', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'ru',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "crmNotes" TEXT,
    "allergies" TEXT,
    "preferences" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleRu" TEXT NOT NULL,
    "roleDe" TEXT NOT NULL,
    "bioRu" TEXT NOT NULL,
    "bioDe" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "descriptionRu" TEXT NOT NULL,
    "descriptionDe" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterService" (
    "masterId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "MasterService_pkey" PRIMARY KEY ("masterId","serviceId")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHours" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "masterId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "headlineRu" TEXT NOT NULL,
    "headlineDe" TEXT NOT NULL,
    "bodyRu" TEXT NOT NULL,
    "bodyDe" TEXT NOT NULL,
    "discountPct" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoService" (
    "promoId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "PromoService_pkey" PRIMARY KEY ("promoId","serviceId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "MasterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Booking_masterId_startsAt_idx" ON "Booking"("masterId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_clientId_startsAt_idx" ON "Booking"("clientId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateIndex
CREATE INDEX "WorkingHours_masterId_idx" ON "WorkingHours"("masterId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_masterId_dayOfWeek_key" ON "WorkingHours"("masterId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimeOff_masterId_startsAt_idx" ON "TimeOff"("masterId", "startsAt");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_createdAt_idx" ON "ClientNote"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterService" ADD CONSTRAINT "MasterService_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterService" ADD CONSTRAINT "MasterService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoService" ADD CONSTRAINT "PromoService_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "Promo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoService" ADD CONSTRAINT "PromoService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
