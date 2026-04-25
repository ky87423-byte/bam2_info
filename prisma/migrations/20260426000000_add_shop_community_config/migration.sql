-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isShopCommunityActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPost" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BoardPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardPost_category_createdAt_idx" ON "BoardPost"("category", "createdAt");

-- CreateIndex
CREATE INDEX "BoardPost_authorId_createdAt_idx" ON "BoardPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "BoardPost_category_isVisible_deletedAt_idx" ON "BoardPost"("category", "isVisible", "deletedAt");

-- AddForeignKey
ALTER TABLE "BoardPost" ADD CONSTRAINT "BoardPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

