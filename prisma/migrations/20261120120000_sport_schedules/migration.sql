CREATE TABLE "SportSchedule" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "pdfData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SportSchedule_sportId_key" ON "SportSchedule"("sportId");

ALTER TABLE "SportSchedule" ADD CONSTRAINT "SportSchedule_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
