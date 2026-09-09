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
    "suggestedActions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "statusNote" TEXT,
    "statusChangedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "aiRiskScore" DOUBLE PRECISION,
    "aiAnalysis" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnomalyDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fields" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "method" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_idx" ON "AnomalyDetection"("tenantId");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_ruleId_idx" ON "AnomalyDetection"("tenantId", "ruleId");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_status_idx" ON "AnomalyDetection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_severity_idx" ON "AnomalyDetection"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_entityType_idx" ON "AnomalyDetection"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "AnomalyDetection_tenantId_detectedAt_idx" ON "AnomalyDetection"("tenantId", "detectedAt");

-- CreateIndex
CREATE INDEX "ExtractionHistory_tenantId_idx" ON "ExtractionHistory"("tenantId");

-- CreateIndex
CREATE INDEX "ExtractionHistory_tenantId_documentType_idx" ON "ExtractionHistory"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "ExtractionHistory_tenantId_extractedAt_idx" ON "ExtractionHistory"("tenantId", "extractedAt");

-- AddForeignKey
ALTER TABLE "AnomalyDetection" ADD CONSTRAINT "AnomalyDetection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionHistory" ADD CONSTRAINT "ExtractionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
