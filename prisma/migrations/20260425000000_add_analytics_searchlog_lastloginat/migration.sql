-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'CALL', 'MAP', 'RESERVATION');

-- AlterTable: Shop에 lastLoginAt 추가
ALTER TABLE "Shop" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "eventType" "EventType" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (복합 인덱스: storeId + eventType + createdAt)
CREATE INDEX "AnalyticsEvent_storeId_eventType_createdAt_idx" ON "AnalyticsEvent"("storeId", "eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
