-- CreateTable
CREATE TABLE "CommunityAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetCode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'LAINNYA',
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(19,4),
    "condition" TEXT NOT NULL DEFAULT 'BAIK',
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "location" TEXT,
    "custodianMemberId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityAsset_tenantId_deletedAt_idx" ON "CommunityAsset"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "CommunityAsset_tenantId_category_idx" ON "CommunityAsset"("tenantId", "category");

-- CreateIndex
CREATE INDEX "CommunityAsset_tenantId_condition_idx" ON "CommunityAsset"("tenantId", "condition");

-- CreateIndex
CREATE INDEX "CommunityAsset_tenantId_status_idx" ON "CommunityAsset"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityAsset_tenantId_idx" ON "CommunityAsset"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityAsset_tenantId_assetCode_key" ON "CommunityAsset"("tenantId", "assetCode");

-- AddForeignKey
ALTER TABLE "CommunityAsset" ADD CONSTRAINT "CommunityAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAsset" ADD CONSTRAINT "CommunityAsset_custodianMemberId_fkey" FOREIGN KEY ("custodianMemberId") REFERENCES "CommunityMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
