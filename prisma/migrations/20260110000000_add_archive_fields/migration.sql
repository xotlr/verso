-- Add isArchived field to Project
ALTER TABLE "Project" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Add isArchived field to Screenplay
ALTER TABLE "Screenplay" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Add isArchived field to Series
ALTER TABLE "Series" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
