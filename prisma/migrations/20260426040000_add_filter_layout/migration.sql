-- CreateEnum
CREATE TYPE "FilterLayout" AS ENUM ('DOUBLE_TAB', 'DROPDOWN', 'SIDEBAR', 'TAB_SWITCH');

-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN     "filterLayout" "FilterLayout" NOT NULL DEFAULT 'DOUBLE_TAB';

