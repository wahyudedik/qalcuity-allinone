-- ============================================================
-- Drift Repair: Missing Models + Schema Gaps
-- Date: 7 October 2026 (Session 70i)
-- Source of truth: packages/db/prisma/schema.prisma (UNCHANGED)
-- Generated via: prisma migrate diff
--   --from-migrations ./prisma/migrations
--   --to-schema-datamodel ./prisma/schema.prisma
--
-- Motivation:
--   Model PasswordPolicy (SEC-07, Session 49) ditambahkan ke
--   schema.prisma TANPA file migrasi -> production 503
--   "table PasswordPolicy does not exist" on
--   /api/settings/password-policy.
--
--   Audit drift lengkap (prisma migrate diff against shadow DB)
--   menemukan 4 tabel tanpa migrasi + gap index/FK/kolom lain.
--   File ini merepresentasikan SELISIH PERSIS antara migrasi
--   yang ada dan schema.prisma saat ini (output migrate diff).
--
-- Tabel yang dicakup:
--   1. PasswordPolicy          (CREATE TABLE + indexes + FK)
--   2. PasswordHistory         (CREATE TABLE + index + FK)
--   3. SoDException            (CREATE TABLE + indexes + FK)
--   4. WhatsAppMessageLog      (CREATE TABLE + indexes + FK)
-- Plus gap migrasi lain yang ditemukan oleh migrate diff:
--   - Decimal precision alignment (AlertRule/AlertTrigger/KPI/KPIEvaluation)
--   - Missing defaults (BankTransaction.amount, Payment.amount, Plan.maxUsers)
--   - Nullable relax (Project.spent, Task.actualHours)
--   - PosRefund: restockItem + restockedAt columns
--   - Missing FKs (KPI, KPIEvaluation, AlertRule, AlertTrigger,
--     UserDashboard, AnalyticsChart, InAppNotification)
--   - Stale FKs di FieldChecklistResult/FieldJobAssignment (tanpa
--     relasi di schema) + stale indexes (Employee, Product)
--   - Missing indexes (JournalEntry, PosPayment, PosRefund,
--     PosTableReservation, UserSession)
--   - RenameIndex loyalty_member_email_unique -> LoyaltyMember_tenantId_email_key
-- ============================================================

-- DropForeignKey
ALTER TABLE "FieldChecklistResult" DROP CONSTRAINT "FieldChecklistResult_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "FieldJobAssignment" DROP CONSTRAINT "FieldJobAssignment_tenantId_fkey";

-- DropIndex
DROP INDEX "Employee_departmentId_idx";

-- DropIndex
DROP INDEX "Product_warehouseId_idx";

-- AlterTable
ALTER TABLE "AlertRule" ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "AlertTrigger" ALTER COLUMN "currentValue" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "threshold" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "amount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "KPI" ALTER COLUMN "target" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "warningThreshold" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "criticalThreshold" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "KPIEvaluation" ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "target" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "changePercent" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "previousValue" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "amount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "maxUsers" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PosRefund" ADD COLUMN     "restockItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "spent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "actualHours" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PasswordPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "minLength" INTEGER NOT NULL DEFAULT 8,
    "maxLength" INTEGER NOT NULL DEFAULT 128,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT false,
    "requireLowercase" BOOLEAN NOT NULL DEFAULT false,
    "requireNumbers" BOOLEAN NOT NULL DEFAULT false,
    "requireSpecialChars" BOOLEAN NOT NULL DEFAULT false,
    "specialChars" TEXT NOT NULL DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
    "preventReuse" INTEGER NOT NULL DEFAULT 0,
    "expiryDays" INTEGER NOT NULL DEFAULT 0,
    "warnBeforeExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoDException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "approverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoDException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT,
    "to" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "templateName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "channel" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordPolicy_tenantId_idx" ON "PasswordPolicy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordPolicy_tenantId_key" ON "PasswordPolicy"("tenantId");

-- CreateIndex
CREATE INDEX "PasswordHistory_userId_createdAt_idx" ON "PasswordHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SoDException_tenantId_ruleId_idx" ON "SoDException"("tenantId", "ruleId");

-- CreateIndex
CREATE INDEX "SoDException_tenantId_userId_idx" ON "SoDException"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SoDException_tenantId_status_idx" ON "SoDException"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_tenantId_idx" ON "WhatsAppMessageLog"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_tenantId_entityType_entityId_idx" ON "WhatsAppMessageLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_tenantId_sentAt_idx" ON "WhatsAppMessageLog"("tenantId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessageLog_tenantId_messageId_key" ON "WhatsAppMessageLog"("tenantId", "messageId");

-- CreateIndex
CREATE INDEX "JournalEntry_entryNumber_idx" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "PosPayment_tenantId_status_idx" ON "PosPayment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PosRefund_tenantId_status_idx" ON "PosRefund"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PosTableReservation_tenantId_reservationTime_idx" ON "PosTableReservation"("tenantId", "reservationTime");

-- CreateIndex
CREATE INDEX "PosTableReservation_tenantId_status_idx" ON "PosTableReservation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIEvaluation" ADD CONSTRAINT "KPIEvaluation_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "KPI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertTrigger" ADD CONSTRAINT "AlertTrigger_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AlertRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDashboard" ADD CONSTRAINT "UserDashboard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDashboard" ADD CONSTRAINT "UserDashboard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsChart" ADD CONSTRAINT "AnalyticsChart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsChart" ADD CONSTRAINT "AnalyticsChart_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "AnalyticsDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsChart" ADD CONSTRAINT "AnalyticsChart_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordPolicy" ADD CONSTRAINT "PasswordPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordHistory" ADD CONSTRAINT "PasswordHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoDException" ADD CONSTRAINT "SoDException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "loyalty_member_email_unique" RENAME TO "LoyaltyMember_tenantId_email_key";
