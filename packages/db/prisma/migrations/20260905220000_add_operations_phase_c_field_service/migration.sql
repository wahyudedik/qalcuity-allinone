-- CreateTable
CREATE TABLE "FieldJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(10, 7),
    "longitude" DECIMAL(10, 7),
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "estimatedDuration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldJobAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECHNICIAN',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "FieldJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldChecklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "items" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldChecklistResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "photos" TEXT,
    "notes" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldChecklistResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldJob_tenantId_status_idx" ON "FieldJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FieldJob_tenantId_scheduledDate_idx" ON "FieldJob"("tenantId", "scheduledDate");

-- CreateIndex
CREATE INDEX "FieldJob_tenantId_projectId_idx" ON "FieldJob"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldJobAssignment_jobId_employeeId_key" ON "FieldJobAssignment"("jobId", "employeeId");

-- CreateIndex
CREATE INDEX "FieldJobAssignment_tenantId_jobId_idx" ON "FieldJobAssignment"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "FieldJobAssignment_tenantId_employeeId_idx" ON "FieldJobAssignment"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "FieldChecklist_tenantId_category_idx" ON "FieldChecklist"("tenantId", "category");

-- CreateIndex
CREATE INDEX "FieldChecklist_tenantId_isActive_idx" ON "FieldChecklist"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "FieldChecklistResult_tenantId_jobId_idx" ON "FieldChecklistResult"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "FieldChecklistResult_tenantId_checklistId_idx" ON "FieldChecklistResult"("tenantId", "checklistId");

-- CreateIndex
CREATE INDEX "FieldChecklistResult_tenantId_employeeId_idx" ON "FieldChecklistResult"("tenantId", "employeeId");

-- AddForeignKey
ALTER TABLE "FieldJob" ADD CONSTRAINT "FieldJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldJob" ADD CONSTRAINT "FieldJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldJobAssignment" ADD CONSTRAINT "FieldJobAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldJobAssignment" ADD CONSTRAINT "FieldJobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "FieldJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldChecklist" ADD CONSTRAINT "FieldChecklist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldChecklistResult" ADD CONSTRAINT "FieldChecklistResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldChecklistResult" ADD CONSTRAINT "FieldChecklistResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "FieldJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldChecklistResult" ADD CONSTRAINT "FieldChecklistResult_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "FieldChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
