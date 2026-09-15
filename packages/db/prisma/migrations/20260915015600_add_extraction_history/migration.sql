-- CreateTable
CREATE TABLE "ExtractionHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fields" JSONB NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "method" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractionHistory_tenantId_idx" ON "ExtractionHistory"("tenantId");

-- CreateIndex
CREATE INDEX "ExtractionHistory_tenantId_documentType_idx" ON "ExtractionHistory"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "ExtractionHistory_extractedAt_idx" ON "ExtractionHistory"("extractedAt");

-- AddForeignKey
ALTER TABLE "ExtractionHistory" ADD CONSTRAINT "ExtractionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
