-- CreateTable: Create Role table (if not exists) for custom role support
CREATE TABLE IF NOT EXISTS "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on tenantId + name
CREATE UNIQUE INDEX IF NOT EXISTS "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex: Index on tenantId
CREATE INDEX IF NOT EXISTS "Role_tenantId_idx" ON "Role"("tenantId");

-- AddForeignKey: Role -> Tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Role_tenantId_fkey'
    ) THEN
        ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add optional roleId column to User for custom role support
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- CreateIndex: Index on roleId for efficient lookups
CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey: Foreign key to Role table (optional reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_roleId_fkey'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
