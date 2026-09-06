-- Operations Module Phase B: Gantt Chart + Resource Allocation + Budget Tracking
-- Migration: 20260905210000_add_operations_phase_b

-- 1. Add new fields to Task model (Phase B)
ALTER TABLE "Task" ADD COLUMN "startDate"    TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "endDate"      TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "progress"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "dependsOnId"  TEXT;

-- Add foreign key for task dependency
ALTER TABLE "Task" ADD CONSTRAINT "Task_dependsOnId_fkey"
  FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for task dependency
CREATE INDEX "Task_dependsOnId_idx" ON "Task"("dependsOnId");

-- 2. Create ProjectBudget table
CREATE TABLE "ProjectBudget" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "planned"     DECIMAL(15,2) NOT NULL,
    "actual"      DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- ProjectBudget indexes
CREATE INDEX "ProjectBudget_tenantId_projectId_idx" ON "ProjectBudget"("tenantId", "projectId");
CREATE INDEX "ProjectBudget_tenantId_projectId_category_idx" ON "ProjectBudget"("tenantId", "projectId", "category");

-- ProjectBudget foreign keys
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Create ResourceAllocation table
CREATE TABLE "ResourceAllocation" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "projectId"      TEXT NOT NULL,
    "employeeId"     TEXT NOT NULL,
    "role"           TEXT NOT NULL DEFAULT 'MEMBER',
    "allocationPct"  INTEGER NOT NULL DEFAULT 100,
    "startDate"      TIMESTAMP(3) NOT NULL,
    "endDate"        TIMESTAMP(3) NOT NULL,
    "hourlyRate"     DECIMAL(10,2),
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- ResourceAllocation unique constraint
CREATE UNIQUE INDEX "ResourceAllocation_projectId_employeeId_startDate_key"
  ON "ResourceAllocation"("projectId", "employeeId", "startDate");

-- ResourceAllocation indexes
CREATE INDEX "ResourceAllocation_tenantId_projectId_idx" ON "ResourceAllocation"("tenantId", "projectId");
CREATE INDEX "ResourceAllocation_tenantId_employeeId_idx" ON "ResourceAllocation"("tenantId", "employeeId");
CREATE INDEX "ResourceAllocation_tenantId_projectId_employeeId_idx"
  ON "ResourceAllocation"("tenantId", "projectId", "employeeId");

-- ResourceAllocation foreign keys
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
