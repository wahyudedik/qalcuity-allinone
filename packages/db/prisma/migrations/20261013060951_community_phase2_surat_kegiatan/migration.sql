-- AlterTable
ALTER TABLE "CommunityCashTransaction" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "CommunityLetter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "letterNumber" TEXT,
    "letterType" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "bodySnapshot" JSONB,
    "issuedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "signedByName" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "verifyToken" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "maxCapacity" INTEGER,
    "budgetAmount" DECIMAL(19,4),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "publishedAt" TIMESTAMP(3),
    "announcementId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLetter_verifyToken_key" ON "CommunityLetter"("verifyToken");

-- CreateIndex
CREATE INDEX "CommunityLetter_tenantId_status_idx" ON "CommunityLetter"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityLetter_tenantId_memberId_idx" ON "CommunityLetter"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "CommunityLetter_tenantId_idx" ON "CommunityLetter"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLetter_tenantId_letterNumber_key" ON "CommunityLetter"("tenantId", "letterNumber");

-- CreateIndex
CREATE INDEX "CommunityEvent_tenantId_status_idx" ON "CommunityEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityEvent_tenantId_startsAt_idx" ON "CommunityEvent"("tenantId", "startsAt");

-- CreateIndex
CREATE INDEX "CommunityEvent_tenantId_idx" ON "CommunityEvent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEvent_tenantId_eventNumber_key" ON "CommunityEvent"("tenantId", "eventNumber");

-- CreateIndex
CREATE INDEX "CommunityCashTransaction_tenantId_eventId_idx" ON "CommunityCashTransaction"("tenantId", "eventId");

-- AddForeignKey
ALTER TABLE "CommunityCashTransaction" ADD CONSTRAINT "CommunityCashTransaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityLetter" ADD CONSTRAINT "CommunityLetter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityLetter" ADD CONSTRAINT "CommunityLetter_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEvent" ADD CONSTRAINT "CommunityEvent_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "CommunityAnnouncement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
