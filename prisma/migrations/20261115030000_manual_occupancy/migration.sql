-- Track people using a facility without a SportsBook booking or gym QR session.
ALTER TABLE "Sport" ADD COLUMN "manualOccupancy" INTEGER NOT NULL DEFAULT 0;
