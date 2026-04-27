-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN     "rankingExcludedUsernames" TEXT[] DEFAULT ARRAY[]::TEXT[];

