-- CreateTable
CREATE TABLE "CommunityAssetLoan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "loanDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "conditionAtLoan" TEXT NOT NULL DEFAULT 'BAIK',
    "conditionAtReturn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "returnNotes" TEXT,
    "createdBy" TEXT,
    "returnedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityAssetLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityAssetLoan_tenantId_assetId_idx" ON "CommunityAssetLoan"("tenantId", "assetId");

-- CreateIndex
CREATE INDEX "CommunityAssetLoan_tenantId_memberId_idx" ON "CommunityAssetLoan"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "CommunityAssetLoan_tenantId_status_idx" ON "CommunityAssetLoan"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityAssetLoan_tenantId_dueDate_idx" ON "CommunityAssetLoan"("tenantId", "dueDate");

-- AddForeignKey
ALTER TABLE "CommunityAssetLoan" ADD CONSTRAINT "CommunityAssetLoan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAssetLoan" ADD CONSTRAINT "CommunityAssetLoan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CommunityAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAssetLoan" ADD CONSTRAINT "CommunityAssetLoan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
