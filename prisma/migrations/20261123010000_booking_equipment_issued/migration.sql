-- Existing equipment rows were already reserved before this flag was added.
ALTER TABLE "BookingEquipment" ADD COLUMN "issued" BOOLEAN NOT NULL DEFAULT true;
