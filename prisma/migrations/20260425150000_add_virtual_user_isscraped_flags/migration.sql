-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "isScraped" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "virtualUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_virtualUserId_key" ON "Shop"("virtualUserId");

-- CreateIndex
CREATE INDEX "Shop_isScraped_idx" ON "Shop"("isScraped");

-- AlterTable: User.isVirtual (스크랩 업소용 가상 계정 플래그)
ALTER TABLE "User" ADD COLUMN     "isVirtual" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isVirtual_idx" ON "User"("isVirtual");
