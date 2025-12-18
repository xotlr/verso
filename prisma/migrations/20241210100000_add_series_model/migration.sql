-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT,
    "genre" TEXT,
    "format" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- Add seriesId column to Screenplay (idempotent)
ALTER TABLE "Screenplay" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Series_userId_idx" ON "Series"("userId");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Series_projectId_idx" ON "Series"("projectId");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Screenplay_seriesId_idx" ON "Screenplay"("seriesId");

-- AddForeignKey: Series -> User (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Series_userId_fkey') THEN
        ALTER TABLE "Series" ADD CONSTRAINT "Series_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Series -> Project (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Series_projectId_fkey') THEN
        ALTER TABLE "Series" ADD CONSTRAINT "Series_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Screenplay -> Series (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Screenplay_seriesId_fkey') THEN
        ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_seriesId_fkey"
            FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
