-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nikEncrypted" TEXT,
    "nomorKkEncrypted" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "address" TEXT,
    "rtRw" TEXT,
    "houseStatus" TEXT NOT NULL DEFAULT 'OWNER',
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3),
    "notes" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityDuesType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(19,4) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityDuesType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityDuesBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "duesTypeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountDue" DECIMAL(19,4) NOT NULL,
    "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityDuesBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityDuesPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityDuesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCashTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "txNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "duesTypeId" TEXT,
    "amount" DECIMAL(19,4) NOT NULL,
    "description" TEXT NOT NULL,
    "txDate" TIMESTAMP(3) NOT NULL,
    "attachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityCashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAnnouncement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityMember_tenantId_status_idx" ON "CommunityMember"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityMember_tenantId_idx" ON "CommunityMember"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_tenantId_code_key" ON "CommunityMember"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CommunityDuesType_tenantId_isActive_idx" ON "CommunityDuesType"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "CommunityDuesType_tenantId_idx" ON "CommunityDuesType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityDuesType_tenantId_code_key" ON "CommunityDuesType"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CommunityDuesBill_tenantId_status_idx" ON "CommunityDuesBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityDuesBill_tenantId_period_idx" ON "CommunityDuesBill"("tenantId", "period");

-- CreateIndex
CREATE INDEX "CommunityDuesBill_tenantId_memberId_idx" ON "CommunityDuesBill"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "CommunityDuesBill_tenantId_idx" ON "CommunityDuesBill"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityDuesBill_tenantId_memberId_duesTypeId_period_key" ON "CommunityDuesBill"("tenantId", "memberId", "duesTypeId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityDuesBill_tenantId_billNumber_key" ON "CommunityDuesBill"("tenantId", "billNumber");

-- CreateIndex
CREATE INDEX "CommunityDuesPayment_tenantId_paidAt_idx" ON "CommunityDuesPayment"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "CommunityDuesPayment_tenantId_billId_idx" ON "CommunityDuesPayment"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "CommunityDuesPayment_tenantId_idx" ON "CommunityDuesPayment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityDuesPayment_tenantId_paymentNumber_key" ON "CommunityDuesPayment"("tenantId", "paymentNumber");

-- CreateIndex
CREATE INDEX "CommunityCashTransaction_tenantId_status_idx" ON "CommunityCashTransaction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityCashTransaction_tenantId_txDate_idx" ON "CommunityCashTransaction"("tenantId", "txDate");

-- CreateIndex
CREATE INDEX "CommunityCashTransaction_tenantId_type_idx" ON "CommunityCashTransaction"("tenantId", "type");

-- CreateIndex
CREATE INDEX "CommunityCashTransaction_tenantId_idx" ON "CommunityCashTransaction"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCashTransaction_tenantId_txNumber_key" ON "CommunityCashTransaction"("tenantId", "txNumber");

-- CreateIndex
CREATE INDEX "CommunityAnnouncement_tenantId_isActive_idx" ON "CommunityAnnouncement"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "CommunityAnnouncement_tenantId_idx" ON "CommunityAnnouncement"("tenantId");

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesType" ADD CONSTRAINT "CommunityDuesType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesBill" ADD CONSTRAINT "CommunityDuesBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesBill" ADD CONSTRAINT "CommunityDuesBill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesBill" ADD CONSTRAINT "CommunityDuesBill_duesTypeId_fkey" FOREIGN KEY ("duesTypeId") REFERENCES "CommunityDuesType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesPayment" ADD CONSTRAINT "CommunityDuesPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesPayment" ADD CONSTRAINT "CommunityDuesPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CommunityDuesBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDuesPayment" ADD CONSTRAINT "CommunityDuesPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityCashTransaction" ADD CONSTRAINT "CommunityCashTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityCashTransaction" ADD CONSTRAINT "CommunityCashTransaction_duesTypeId_fkey" FOREIGN KEY ("duesTypeId") REFERENCES "CommunityDuesType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAnnouncement" ADD CONSTRAINT "CommunityAnnouncement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
