-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'FORWARDED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "ownerId" INTEGER;

-- CreateTable
CREATE TABLE "AdminInquiry" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,
    "virtualUserId" INTEGER,
    "content" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AdminInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRequest" (
    "id" SERIAL NOT NULL,
    "shopId" INTEGER NOT NULL,
    "claimantId" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "proofText" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminInquiry_status_createdAt_idx" ON "AdminInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminInquiry_shopId_createdAt_idx" ON "AdminInquiry"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminInquiry_senderId_createdAt_idx" ON "AdminInquiry"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimRequest_status_createdAt_idx" ON "ClaimRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimRequest_shopId_idx" ON "ClaimRequest"("shopId");

-- CreateIndex
CREATE INDEX "ClaimRequest_claimantId_createdAt_idx" ON "ClaimRequest"("claimantId", "createdAt");

-- CreateIndex
CREATE INDEX "Shop_ownerId_idx" ON "Shop"("ownerId");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInquiry" ADD CONSTRAINT "AdminInquiry_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInquiry" ADD CONSTRAINT "AdminInquiry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

