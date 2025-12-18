-- Add banner column to Series
ALTER TABLE "Series" ADD COLUMN IF NOT EXISTS "banner" TEXT;

-- CreateTable: Season
CREATE TABLE IF NOT EXISTS "Season" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- Add seasonId column to Screenplay
ALTER TABLE "Screenplay" ADD COLUMN IF NOT EXISTS "seasonId" TEXT;

-- CreateIndex for Season
CREATE INDEX IF NOT EXISTS "Season_seriesId_idx" ON "Season"("seriesId");

-- CreateIndex for unique season numbers within a series
CREATE UNIQUE INDEX IF NOT EXISTS "Season_seriesId_number_key" ON "Season"("seriesId", "number");

-- CreateIndex for Screenplay.seasonId
CREATE INDEX IF NOT EXISTS "Screenplay_seasonId_idx" ON "Screenplay"("seasonId");

-- AddForeignKey: Season -> Series
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Season_seriesId_fkey') THEN
        ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey"
            FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Screenplay -> Season
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Screenplay_seasonId_fkey') THEN
        ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_seasonId_fkey"
            FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Data Migration: Create Season 1 for series with existing episodes
-- First, create Season 1 for any series that has direct episodes but no seasons yet
INSERT INTO "Season" ("id", "number", "title", "seriesId", "updatedAt")
SELECT
    gen_random_uuid()::text,
    1,
    'Season 1',
    s."id",
    NOW()
FROM "Series" s
WHERE EXISTS (
    SELECT 1 FROM "Screenplay" sp
    WHERE sp."seriesId" = s."id"
    AND sp."seasonId" IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM "Season" sn
    WHERE sn."seriesId" = s."id"
    AND sn."number" = 1
);

-- Then, link existing episodes to their Season 1
UPDATE "Screenplay" sp
SET "seasonId" = (
    SELECT sn."id"
    FROM "Season" sn
    WHERE sn."seriesId" = sp."seriesId"
    AND sn."number" = 1
    LIMIT 1
)
WHERE sp."seriesId" IS NOT NULL
AND sp."seasonId" IS NULL;
