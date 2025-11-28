-- Migration: Restructure Project/Screenplay
-- This migration converts existing Projects (which store screenplay content)
-- to standalone Screenplays and transforms Project into a workspace container

-- Step 1: Create the new Screenplay table
CREATE TABLE "Screenplay" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "synopsis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "Screenplay_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create the Note table
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create the Schedule table
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create the Budget table
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- Step 5: Migrate existing Project data to Screenplay (as standalone screenplays)
INSERT INTO "Screenplay" ("id", "title", "content", "synopsis", "createdAt", "updatedAt", "userId", "projectId", "teamId")
SELECT
    "id",
    "title",
    "content",
    "synopsis",
    "createdAt",
    "updatedAt",
    "userId",
    NULL,  -- standalone (no project)
    "teamId"
FROM "Project";

-- Step 6: Drop the old content columns from Project and transform it to workspace
ALTER TABLE "Project" DROP COLUMN "content";
ALTER TABLE "Project" DROP COLUMN "synopsis";
ALTER TABLE "Project" DROP COLUMN "title";

-- Step 7: Add new workspace columns to Project
ALTER TABLE "Project" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Untitled Project';
ALTER TABLE "Project" ADD COLUMN "description" TEXT;
ALTER TABLE "Project" ADD COLUMN "coverImage" TEXT;

-- Step 8: Remove the default (it was just for migration)
ALTER TABLE "Project" ALTER COLUMN "name" DROP DEFAULT;

-- Step 9: Delete the old Project records (they're now Screenplays)
-- Note: We keep the Project table but clear it since data moved to Screenplay
DELETE FROM "Project";

-- Step 10: Create indexes for Screenplay
CREATE INDEX "Screenplay_userId_idx" ON "Screenplay"("userId");
CREATE INDEX "Screenplay_projectId_idx" ON "Screenplay"("projectId");
CREATE INDEX "Screenplay_teamId_idx" ON "Screenplay"("teamId");

-- Step 11: Create indexes for Note, Schedule, Budget
CREATE INDEX "Note_projectId_idx" ON "Note"("projectId");
CREATE INDEX "Schedule_projectId_idx" ON "Schedule"("projectId");
CREATE INDEX "Budget_projectId_idx" ON "Budget"("projectId");

-- Step 12: Add foreign key constraints for Screenplay
ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 13: Add foreign key constraints for Note
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 14: Add foreign key constraints for Schedule
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 15: Add foreign key constraints for Budget
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
