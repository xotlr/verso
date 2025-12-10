-- CreateTable
CREATE TABLE "Series" (
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

-- Add seriesId column to Screenplay
ALTER TABLE "Screenplay" ADD COLUMN "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Series_userId_idx" ON "Series"("userId");

-- CreateIndex
CREATE INDEX "Series_projectId_idx" ON "Series"("projectId");

-- CreateIndex
CREATE INDEX "Screenplay_seriesId_idx" ON "Screenplay"("seriesId");

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenplay" ADD CONSTRAINT "Screenplay_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
