-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "adminAcknowledgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_adminAcknowledgedAt_idx" ON "Message"("adminAcknowledgedAt");

