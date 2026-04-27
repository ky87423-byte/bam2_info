-- CreateEnum
CREATE TYPE "RankingPeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "RankingMode" AS ENUM ('BALANCE', 'PERIOD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "title" VARCHAR(80),
ADD COLUMN     "titleAwardedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RankingReward" (
    "id" SERIAL NOT NULL,
    "periodKey" VARCHAR(32) NOT NULL,
    "periodType" "RankingPeriodType" NOT NULL,
    "mode" "RankingMode" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rank" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "prizeShipped" BOOLEAN NOT NULL DEFAULT false,
    "prizeMemo" TEXT NOT NULL DEFAULT '',
    "shippedAt" TIMESTAMP(3),
    "shippedBy" INTEGER,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingReward_userId_createdAt_idx" ON "RankingReward"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RankingReward_prizeShipped_idx" ON "RankingReward"("prizeShipped");

-- CreateIndex
CREATE INDEX "RankingReward_periodType_createdAt_idx" ON "RankingReward"("periodType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RankingReward_periodKey_rank_key" ON "RankingReward"("periodKey", "rank");

-- AddForeignKey
ALTER TABLE "RankingReward" ADD CONSTRAINT "RankingReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

