-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "externalId" INTEGER,
ADD COLUMN     "lastScrapedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_externalId_key" ON "Shop"("externalId");

-- CreateIndex
CREATE INDEX "Shop_lastScrapedAt_idx" ON "Shop"("lastScrapedAt");

