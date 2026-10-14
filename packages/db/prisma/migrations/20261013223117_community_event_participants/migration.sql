-- CreateTable
CREATE TABLE "CommunityEventParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "note" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityEventParticipant_tenantId_eventId_idx" ON "CommunityEventParticipant"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "CommunityEventParticipant_tenantId_memberId_idx" ON "CommunityEventParticipant"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "CommunityEventParticipant_tenantId_status_idx" ON "CommunityEventParticipant"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityEventParticipant_tenantId_idx" ON "CommunityEventParticipant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEventParticipant_tenantId_eventId_memberId_key" ON "CommunityEventParticipant"("tenantId", "eventId", "memberId");

-- AddForeignKey
ALTER TABLE "CommunityEventParticipant" ADD CONSTRAINT "CommunityEventParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEventParticipant" ADD CONSTRAINT "CommunityEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommunityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityEventParticipant" ADD CONSTRAINT "CommunityEventParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
