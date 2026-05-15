-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'MISSING', 'DELETED_CONFIRMED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "lastSeenInListAt" TIMESTAMP(3),
ADD COLUMN     "missingStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceStatus" "SourceStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "PointLog_action_createdAt_idx" ON "PointLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Shop_sourceStatus_idx" ON "Shop"("sourceStatus");

-- CreateIndex
CREATE INDEX "Shop_lastSeenInListAt_idx" ON "Shop"("lastSeenInListAt");
