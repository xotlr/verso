-- Simplify ScreenplayType enum: FEATURE -> FILM, remove SHORT (merge into FILM)

-- Step 1: Add new FILM value to the enum
ALTER TYPE "ScreenplayType" ADD VALUE IF NOT EXISTS 'FILM';

-- Step 2: Update existing screenplays - FEATURE and SHORT both become FILM
UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType" WHERE type = 'FEATURE'::"ScreenplayType";
UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType" WHERE type = 'SHORT'::"ScreenplayType";

-- Step 3: Update the default value for new screenplays
ALTER TABLE "Screenplay" ALTER COLUMN "type" SET DEFAULT 'FILM'::"ScreenplayType";

-- Note: Removing enum values in PostgreSQL is complex and typically not done.
-- The old values (FEATURE, SHORT) will remain in the enum but won't be used.
-- This is safe as the application code will only use FILM and TV.
