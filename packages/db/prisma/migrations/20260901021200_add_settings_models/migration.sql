-- CreateTable
CREATE TABLE "TenantNotificationSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailInvoice" BOOLEAN NOT NULL DEFAULT true,
    "emailPayment" BOOLEAN NOT NULL DEFAULT true,
    "emailOverdue" BOOLEAN NOT NULL DEFAULT true,
    "emailWeeklyReport" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "pushInvoice" BOOLEAN NOT NULL DEFAULT true,
    "pushPayment" BOOLEAN NOT NULL DEFAULT true,
    "pushOverdue" BOOLEAN NOT NULL DEFAULT true,
    "pushMention" BOOLEAN NOT NULL DEFAULT true,
    "whatsappInvoice" BOOLEAN NOT NULL DEFAULT true,
    "whatsappPayment" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOverdue" BOOLEAN NOT NULL DEFAULT false,
    "smsOverdue" BOOLEAN NOT NULL DEFAULT false,
    "smsPayment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "config" JSONB NOT NULL DEFAULT '{}',
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "webhookUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantNotificationSettings_tenantId_key" ON "TenantNotificationSettings"("tenantId");

-- CreateIndex
CREATE INDEX "TenantNotificationSettings_tenantId_idx" ON "TenantNotificationSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantIntegration_tenantId_type_name_key" ON "TenantIntegration"("tenantId", "type", "name");

-- CreateIndex
CREATE INDEX "TenantIntegration_tenantId_idx" ON "TenantIntegration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantIntegration_tenantId_type_idx" ON "TenantIntegration"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "TenantNotificationSettings" ADD CONSTRAINT "TenantNotificationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantIntegration" ADD CONSTRAINT "TenantIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
