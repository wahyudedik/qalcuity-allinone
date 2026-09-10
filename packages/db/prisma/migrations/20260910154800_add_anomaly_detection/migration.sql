-- CreateTable
CREATE TABLE "AnomalyDetection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "suggestedActions" JSONB,
    "aiRiskScore" DECIMAL(5, 2),
    "aiAnalysis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "statusNote" TEXT,
    "statusChangedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnomalyDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_idx" ON "AnomalyDetection"("tenantId");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_severity_idx" ON "AnomalyDetection"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_status_idx" ON "AnomalyDetection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_entityType_idx" ON "AnomalyDetection"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "AnomalyDetection_detectedAt_idx" ON "AnomalyDetection"("detectedAt");

-- AddForeignKey
ALTER TABLE "AnomalyDetection" ADD CONSTRAINT "AnomalyDetection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
