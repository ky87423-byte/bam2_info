-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "isScraped" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "virtualUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_virtualUserId_key" ON "Shop"("virtualUserId");

-- CreateIndex
CREATE INDEX "Shop_isScraped_idx" ON "Shop"("isScraped");

