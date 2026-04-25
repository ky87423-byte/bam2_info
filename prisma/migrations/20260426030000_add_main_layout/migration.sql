-- CreateEnum
CREATE TYPE "MainLayout" AS ENUM ('GRID', 'LIST_CARD', 'BOARD');

-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN     "mainLayout" "MainLayout" NOT NULL DEFAULT 'GRID';

