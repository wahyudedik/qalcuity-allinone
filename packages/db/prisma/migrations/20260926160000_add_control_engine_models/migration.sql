-- Migration: Add Unified Control Engine models
-- Date: 26 September 2026
-- Phase 1: Foundation (Schema + Pipeline Orchestrator)

-- CreateTable: ControlPolicy
CREATE TABLE "ControlPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "effect" TEXT NOT NULL DEFAULT 'allow',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SoDRule
CREATE TABLE "SoDRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role1" TEXT NOT NULL,
    "role2" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoDRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SLATracker
CREATE TABLE "SLATracker" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "targetHours" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "escalatedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SLATracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LockRecord
CREATE TABLE "LockRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockType" TEXT NOT NULL DEFAULT 'edit',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LockRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransactionState
CREATE TABLE "TransactionState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "previousState" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "TransactionState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ControlPolicy
CREATE UNIQUE INDEX "ControlPolicy_tenantId_module_action_name_key" ON "ControlPolicy"("tenantId", "module", "action", "name");
CREATE INDEX "ControlPolicy_tenantId_module_idx" ON "ControlPolicy"("tenantId", "module");

-- CreateIndex: SoDRule
CREATE UNIQUE INDEX "SoDRule_tenantId_name_key" ON "SoDRule"("tenantId", "name");
CREATE INDEX "SoDRule_tenantId_module_idx" ON "SoDRule"("tenantId", "module");

-- CreateIndex: SLATracker
CREATE INDEX "SLATracker_tenantId_entityType_entityId_idx" ON "SLATracker"("tenantId", "entityType", "entityId");
CREATE INDEX "SLATracker_tenantId_status_idx" ON "SLATracker"("tenantId", "status");

-- CreateIndex: LockRecord
CREATE UNIQUE INDEX "LockRecord_tenantId_entityType_entityId_key" ON "LockRecord"("tenantId", "entityType", "entityId");
CREATE INDEX "LockRecord_tenantId_lockedBy_idx" ON "LockRecord"("tenantId", "lockedBy");

-- CreateIndex: TransactionState
CREATE UNIQUE INDEX "TransactionState_tenantId_entityType_entityId_key" ON "TransactionState"("tenantId", "entityType", "entityId");
CREATE INDEX "TransactionState_tenantId_entityType_idx" ON "TransactionState"("tenantId", "entityType");

-- AddForeignKey: ControlPolicy
ALTER TABLE "ControlPolicy" ADD CONSTRAINT "ControlPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SoDRule
ALTER TABLE "SoDRule" ADD CONSTRAINT "SoDRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SLATracker
ALTER TABLE "SLATracker" ADD CONSTRAINT "SLATracker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: LockRecord
ALTER TABLE "LockRecord" ADD CONSTRAINT "LockRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: TransactionState
ALTER TABLE "TransactionState" ADD CONSTRAINT "TransactionState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
