CREATE TYPE "SportType" AS ENUM ('public', 'private');

ALTER TABLE "Sport"
ADD COLUMN "sportType" "SportType" NOT NULL DEFAULT 'private';

UPDATE "Sport"
SET "sportType" = 'public'
WHERE lower("name") IN ('gym', 'swimming');
