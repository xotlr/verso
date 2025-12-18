-- Simplify ScreenplayType enum: Ensure FILM exists and is the default
-- This migration is idempotent and handles various initial states

-- Step 1: Add FILM value to the enum if it doesn't exist
ALTER TYPE "ScreenplayType" ADD VALUE IF NOT EXISTS 'FILM';

-- Step 2: Update existing screenplays - only if old values exist
-- Use a DO block to safely handle cases where values don't exist
DO $$
BEGIN
    -- Try to update FEATURE to FILM (may not exist)
    UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType"
    WHERE type::text = 'FEATURE';
EXCEPTION
    WHEN invalid_text_representation THEN
        -- FEATURE doesn't exist, that's fine
        NULL;
END $$;

DO $$
BEGIN
    -- Try to update SHORT to FILM (may not exist)
    UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType"
    WHERE type::text = 'SHORT';
EXCEPTION
    WHEN invalid_text_representation THEN
        -- SHORT doesn't exist, that's fine
        NULL;
END $$;

-- Step 3: Update the default value for new screenplays
ALTER TABLE "Screenplay" ALTER COLUMN "type" SET DEFAULT 'FILM'::"ScreenplayType";

-- Note: Removing enum values in PostgreSQL is complex and typically not done.
-- The old values (FEATURE, SHORT) will remain in the enum but won't be used.
-- This is safe as the application code will only use FILM and TV.
