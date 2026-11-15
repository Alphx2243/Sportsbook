-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'Admin', 'guard', 'facility_manager');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'active', 'returned', 'expired', 'completed');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('live', 'upcoming', 'finished');

-- CreateEnum
CREATE TYPE "GymLogStatus" AS ENUM ('active', 'completed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "qrCodePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfCourts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "courtId" TEXT,
    "numberOfPlayers" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "qrDetail" TEXT,
    "qrHash" TEXT,
    "status" "BookingStatus" NOT NULL,
    "scanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "team1" TEXT NOT NULL,
    "team2" TEXT NOT NULL,
    "score1" TEXT NOT NULL,
    "score2" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideApplication" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "level" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT,
    "description" TEXT,
    "avDays" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "GymLogStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "GymLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEquipment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BookingEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "courtNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "inUse" INTEGER NOT NULL DEFAULT 0,
    "sportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSportExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSportExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_rollNumber_idx" ON "User"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_name_key" ON "Sport"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_qrHash_key" ON "Booking"("qrHash");

-- CreateIndex
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");

-- CreateIndex
CREATE INDEX "Booking_sportId_status_idx" ON "Booking"("sportId", "status");

-- CreateIndex
CREATE INDEX "Booking_courtId_idx" ON "Booking"("courtId");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_startAt_status_idx" ON "Booking"("startAt", "status");

-- CreateIndex
CREATE INDEX "Booking_sportId_startAt_idx" ON "Booking"("sportId", "startAt");

-- CreateIndex
CREATE INDEX "Match_sportId_status_idx" ON "Match"("sportId", "status");

-- CreateIndex
CREATE INDEX "Match_status_updatedAt_idx" ON "Match"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "GuideApplication_email_idx" ON "GuideApplication"("email");

-- CreateIndex
CREATE INDEX "GuideApplication_resolved_createdAt_idx" ON "GuideApplication"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "GuideApplication_sportId_resolved_idx" ON "GuideApplication"("sportId", "resolved");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "Invite_show_scheduledAt_idx" ON "Invite"("show", "scheduledAt");

-- CreateIndex
CREATE INDEX "Invite_sportId_scheduledAt_idx" ON "Invite"("sportId", "scheduledAt");

-- CreateIndex
CREATE INDEX "GymLog_userId_status_idx" ON "GymLog"("userId", "status");

-- CreateIndex
CREATE INDEX "GymLog_status_entryTime_idx" ON "GymLog"("status", "entryTime");

-- CreateIndex
CREATE INDEX "BookingEquipment_equipmentId_idx" ON "BookingEquipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingEquipment_bookingId_equipmentId_key" ON "BookingEquipment"("bookingId", "equipmentId");

-- CreateIndex
CREATE INDEX "Court_sportId_isActive_idx" ON "Court"("sportId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Court_sportId_name_key" ON "Court"("sportId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Court_sportId_courtNumber_key" ON "Court"("sportId", "courtNumber");

-- CreateIndex
CREATE INDEX "Equipment_sportId_idx" ON "Equipment"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_sportId_name_key" ON "Equipment"("sportId", "name");

-- CreateIndex
CREATE INDEX "UserSportExperience_sportId_idx" ON "UserSportExperience"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSportExperience_userId_sportId_key" ON "UserSportExperience"("userId", "sportId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideApplication" ADD CONSTRAINT "GuideApplication_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymLog" ADD CONSTRAINT "GymLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEquipment" ADD CONSTRAINT "BookingEquipment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEquipment" ADD CONSTRAINT "BookingEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSportExperience" ADD CONSTRAINT "UserSportExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSportExperience" ADD CONSTRAINT "UserSportExperience_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
