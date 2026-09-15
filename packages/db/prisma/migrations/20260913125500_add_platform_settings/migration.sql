-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'Qalcuity',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@qalcuity.com',
    "defaultTrialDays" INTEGER NOT NULL DEFAULT 14,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "PlanTenantLimit" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "maxTenants" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTenantLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "PlanTenantLimit_planName_key" ON "PlanTenantLimit"("planName");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
