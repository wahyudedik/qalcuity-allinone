-- CreateTable
CREATE TABLE "KPI" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "formula" TEXT,
    "target" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "targetType" TEXT NOT NULL DEFAULT 'gte',
    "warningThreshold" DECIMAL(19,4) DEFAULT 10,
    "criticalThreshold" DECIMAL(19,4) DEFAULT 25,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "ownerId" TEXT,
    "departmentId" TEXT,
    "tenantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIEvaluation" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "value" DECIMAL(19,4) NOT NULL,
    "target" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL,
    "changePercent" DECIMAL(19,4),
    "previousValue" DECIMAL(19,4),
    "period" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metricId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DECIMAL(19,4) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "notificationChannels" TEXT[] DEFAULT ARRAY['in_app'],
    "recipients" TEXT[] DEFAULT ARRAY[],
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertTrigger" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "currentValue" DECIMAL(19,4) NOT NULL,
    "threshold" DECIMAL(19,4) NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsChart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "dataSource" TEXT NOT NULL DEFAULT 'DATASET',
    "datasetId" TEXT,
    "queryId" TEXT,
    "metricId" TEXT,
    "queryConfig" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KPI_tenantId_idx" ON "KPI"("tenantId");

-- CreateIndex
CREATE INDEX "KPI_tenantId_category_idx" ON "KPI"("tenantId", "category");

-- CreateIndex
CREATE INDEX "KPI_tenantId_isActive_idx" ON "KPI"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "KPIEvaluation_tenantId_idx" ON "KPIEvaluation"("tenantId");

-- CreateIndex
CREATE INDEX "KPIEvaluation_kpiId_idx" ON "KPIEvaluation"("kpiId");

-- CreateIndex
CREATE INDEX "KPIEvaluation_kpiId_period_idx" ON "KPIEvaluation"("kpiId", "period");

-- CreateIndex
CREATE INDEX "AlertRule_tenantId_idx" ON "AlertRule"("tenantId");

-- CreateIndex
CREATE INDEX "AlertRule_tenantId_isActive_idx" ON "AlertRule"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "AlertTrigger_tenantId_idx" ON "AlertTrigger"("tenantId");

-- CreateIndex
CREATE INDEX "AlertTrigger_ruleId_idx" ON "AlertTrigger"("ruleId");

-- CreateIndex
CREATE INDEX "AlertTrigger_tenantId_acknowledged_idx" ON "AlertTrigger"("tenantId", "acknowledged");

-- CreateIndex
CREATE INDEX "UserDashboard_tenantId_idx" ON "UserDashboard"("tenantId");

-- CreateIndex
CREATE INDEX "UserDashboard_ownerId_idx" ON "UserDashboard"("ownerId");

-- CreateIndex
CREATE INDEX "UserDashboard_tenantId_isDefault_idx" ON "UserDashboard"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsChart_tenantId_slug_key" ON "AnalyticsChart"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "AnalyticsChart_tenantId_idx" ON "AnalyticsChart"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsChart_ownerId_idx" ON "AnalyticsChart"("ownerId");

-- CreateIndex
CREATE INDEX "AnalyticsChart_datasetId_idx" ON "AnalyticsChart"("datasetId");

-- CreateIndex
CREATE INDEX "InAppNotification_tenantId_userId_isRead_idx" ON "InAppNotification"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "InAppNotification_tenantId_userId_createdAt_idx" ON "InAppNotification"("tenantId", "userId", "createdAt");
