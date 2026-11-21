ALTER TABLE "Court"
ADD COLUMN "manualOccupied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manualOccupancy" INTEGER NOT NULL DEFAULT 0;

UPDATE "Court" AS court
SET "manualOccupancy" = sport."manualOccupancy",
    "manualOccupied" = sport."manualOccupancy" > 0
FROM "Sport" AS sport
WHERE court."sportId" = sport."id"
  AND court."courtNumber" = 1
  AND court."isActive" = true;
