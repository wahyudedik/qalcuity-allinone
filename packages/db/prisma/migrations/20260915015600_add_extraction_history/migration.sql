-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "ExtractionHistory" (
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

-- CreateIndex (idempotent)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "ExtractionHistory_tenantId_idx" ON "ExtractionHistory"("tenantId");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "ExtractionHistory_tenantId_documentType_idx" ON "ExtractionHistory"("tenantId", "documentType");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "ExtractionHistory_extractedAt_idx" ON "ExtractionHistory"("extractedAt");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
    ALTER TABLE "ExtractionHistory" ADD CONSTRAINT "ExtractionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
