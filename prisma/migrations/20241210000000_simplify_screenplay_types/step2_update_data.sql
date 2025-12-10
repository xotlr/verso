-- Step 2: Update existing screenplays - FEATURE and SHORT both become FILM
UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType" WHERE type = 'FEATURE'::"ScreenplayType";
UPDATE "Screenplay" SET type = 'FILM'::"ScreenplayType" WHERE type = 'SHORT'::"ScreenplayType";

-- Step 3: Update the default value for new screenplays
ALTER TABLE "Screenplay" ALTER COLUMN "type" SET DEFAULT 'FILM'::"ScreenplayType";
