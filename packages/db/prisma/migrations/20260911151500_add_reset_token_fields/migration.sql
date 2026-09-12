-- AlterTable: Add resetToken fields to User table
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex for fast token lookup
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");
