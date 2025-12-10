-- Step 1: Add new FILM value to the enum (must be committed separately)
ALTER TYPE "ScreenplayType" ADD VALUE IF NOT EXISTS 'FILM';
