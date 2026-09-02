-- CreateTable
CREATE TABLE "IndustryConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCustomField" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "defaultValue" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndustryConfiguration_tenantId_key" ON "IndustryConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "IndustryConfiguration_tenantId_idx" ON "IndustryConfiguration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantCustomField_tenantId_entity_fieldName_key" ON "TenantCustomField"("tenantId", "entity", "fieldName");

-- CreateIndex
CREATE INDEX "TenantCustomField_tenantId_entity_idx" ON "TenantCustomField"("tenantId", "entity");

-- CreateIndex
CREATE INDEX "TenantCustomField_tenantId_idx" ON "TenantCustomField"("tenantId");

-- AddForeignKey
ALTER TABLE "IndustryConfiguration" ADD CONSTRAINT "IndustryConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCustomField" ADD CONSTRAINT "TenantCustomField_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
