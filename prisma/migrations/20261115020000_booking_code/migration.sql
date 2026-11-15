-- Add a four-digit manual code without changing the internal UUID booking key.
ALTER TABLE "Booking" ADD COLUMN "bookingCode" CHAR(4) NOT NULL DEFAULT '0000';

WITH booking_codes AS (
  SELECT "id", LPAD(((ROW_NUMBER() OVER (ORDER BY "createdAt", "id") - 1) % 10000)::text, 4, '0') AS code
  FROM "Booking"
)
UPDATE "Booking" AS booking
SET "bookingCode" = booking_codes.code
FROM booking_codes
WHERE booking."id" = booking_codes."id";

CREATE INDEX "Booking_bookingCode_status_idx" ON "Booking"("bookingCode", "status");
