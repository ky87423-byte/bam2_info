-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'CALL', 'MAP', 'RESERVATION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SHOP', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PointAction" AS ENUM ('SIGNUP', 'LOGIN', 'ATTEND', 'POST', 'COMMENT', 'LUCKY', 'ADMIN', 'ETC');

-- CreateTable
CREATE TABLE "Shop" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "category2" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "hphone" TEXT NOT NULL DEFAULT '',
    "telegram" TEXT NOT NULL DEFAULT '',
    "hit" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "mainPhoto" TEXT NOT NULL DEFAULT '',
    "photos" TEXT[],
    "time1" TEXT NOT NULL DEFAULT '',
    "time2" TEXT NOT NULL DEFAULT '',
    "timeFull" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "level" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT NOT NULL DEFAULT '',
    "shopPostLimit" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "lastLoginDate" VARCHAR(10),
    "lastAttendDate" VARCHAR(10),
    "attendStreak" INTEGER NOT NULL DEFAULT 0,
    "totalAttend" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "action" "PointAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "content" TEXT NOT NULL,
    "isLuckyWin" BOOLEAN NOT NULL DEFAULT false,
    "luckyAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shop_lastLoginAt_idx" ON "Shop"("lastLoginAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_storeId_eventType_createdAt_idx" ON "AnalyticsEvent"("storeId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_storeId_idx" ON "AnalyticsEvent"("createdAt", "storeId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_ipAddress_createdAt_idx" ON "AnalyticsEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_resultCount_idx" ON "SearchLog"("resultCount");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "PointLog_userId_createdAt_idx" ON "PointLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointLog_createdAt_idx" ON "PointLog"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_createdAt_idx" ON "Comment"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointLog" ADD CONSTRAINT "PointLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
